package askai

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/daveclinton/portfolio/backend/internal/openai"
)

// Embeddings are stored in a table this API owns, next to the knowledge
// tables the Python pipeline owns. Keeping them apart means:
//   - the pipeline can re-ingest chunks without knowing about embeddings
//     (ON DELETE CASCADE drops vectors for deleted chunks);
//   - changing the embedding model only touches this table.
const embeddingTable = "askai_chunk_embedding"

const embedBatchSize = 32

// embedder turns text into vectors. Implementations: the OpenAI embeddings
// API (default), a self-hosted Text Embeddings Inference server, or nothing.
type embedder interface {
	Enabled() bool
	Embed(ctx context.Context, inputs []string) ([][]float32, error)
}

type openAIEmbedder struct {
	client     *openai.Client
	model      string
	dimensions int
}

func (e openAIEmbedder) Enabled() bool { return e.client.Enabled() }

func (e openAIEmbedder) Embed(ctx context.Context, inputs []string) ([][]float32, error) {
	// Only text-embedding-3 models accept a dimensions parameter.
	dimensions := 0
	if strings.HasPrefix(e.model, "text-embedding-3") {
		dimensions = e.dimensions
	}
	return e.client.Embed(ctx, e.model, inputs, dimensions)
}

type disabledEmbedder struct{}

func (disabledEmbedder) Enabled() bool { return false }
func (disabledEmbedder) Embed(context.Context, []string) ([][]float32, error) {
	return nil, errors.New("semantic search is off")
}

// ensureEmbeddingSchema creates the embeddings table and its index. If the
// configured model has a different dimension than the existing column, the
// table is recreated and the indexer rebuilds it.
func (s *Service) ensureEmbeddingSchema(ctx context.Context) error {
	dims := s.cfg.EmbeddingDimensions
	var existing string
	err := s.db.QueryRow(ctx, `
		SELECT format_type(atttypid, atttypmod) FROM pg_attribute
		 WHERE attrelid = to_regclass($1) AND attname = 'embedding'`, embeddingTable).Scan(&existing)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
	case err != nil:
		return fmt.Errorf("inspect %s: %w", embeddingTable, err)
	case existing != fmt.Sprintf("vector(%d)", dims):
		s.log.Warn("embedding dimensions changed; rebuilding embeddings", "was", existing, "now", dims)
		if _, err := s.db.Exec(ctx, "DROP TABLE "+embeddingTable); err != nil {
			return err
		}
	}
	_, err = s.db.Exec(ctx, fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %[1]s (
			chunk_id     bigint PRIMARY KEY REFERENCES knowledge_knowledgechunk(id) ON DELETE CASCADE,
			model        text        NOT NULL,
			content_hash text        NOT NULL,
			embedding    vector(%[2]d) NOT NULL,
			updated_at   timestamptz NOT NULL DEFAULT now()
		);
		CREATE INDEX IF NOT EXISTS %[1]s_hnsw ON %[1]s USING hnsw (embedding vector_cosine_ops);`,
		embeddingTable, dims))
	return err
}

// syncEmbeddings embeds every chunk that is new, changed (content hash) or
// embedded with a different model. It runs at startup and periodically, so
// re-running the ingestion pipeline is all it takes to refresh search.
func (s *Service) syncEmbeddings(ctx context.Context) (int, error) {
	if !s.embedder.Enabled() {
		return 0, nil
	}
	total := 0
	for {
		rows, err := s.db.Query(ctx, `
			SELECT c.id, COALESCE(c.content, ''), md5(COALESCE(c.content, ''))
			  FROM knowledge_knowledgechunk c
			  LEFT JOIN `+embeddingTable+` e ON e.chunk_id = c.id
			 WHERE e.chunk_id IS NULL OR e.model <> $1 OR e.content_hash <> md5(COALESCE(c.content, ''))
			 ORDER BY c.id
			 LIMIT $2`, s.cfg.EmbeddingModel, embedBatchSize)
		if err != nil {
			return total, err
		}
		var ids []int64
		var hashes, inputs []string
		for rows.Next() {
			var id int64
			var content, hash string
			if err := rows.Scan(&id, &content, &hash); err != nil {
				rows.Close()
				return total, err
			}
			ids = append(ids, id)
			hashes = append(hashes, hash)
			inputs = append(inputs, s.cfg.EmbeddingDocumentPrefix+content)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return total, err
		}
		if len(ids) == 0 {
			return total, nil
		}

		vectors, err := s.embedder.Embed(ctx, inputs)
		if err != nil {
			return total, err
		}
		batch := &pgx.Batch{}
		for i, id := range ids {
			if len(vectors[i]) != s.cfg.EmbeddingDimensions {
				return total, fmt.Errorf("model %s returned %d dimensions, EMBEDDING_DIMENSIONS is %d",
					s.cfg.EmbeddingModel, len(vectors[i]), s.cfg.EmbeddingDimensions)
			}
			batch.Queue(`
				INSERT INTO `+embeddingTable+` (chunk_id, model, content_hash, embedding, updated_at)
				VALUES ($1, $2, $3, $4::vector, now())
				ON CONFLICT (chunk_id) DO UPDATE
				   SET model = EXCLUDED.model, content_hash = EXCLUDED.content_hash,
				       embedding = EXCLUDED.embedding, updated_at = now()`,
				id, s.cfg.EmbeddingModel, hashes[i], vectorLiteral(vectors[i]))
		}
		if err := s.db.SendBatch(ctx, batch).Close(); err != nil {
			return total, err
		}
		total += len(ids)
	}
}

func (s *Service) runEmbeddingSync(ctx context.Context) {
	embedded, err := s.syncEmbeddings(ctx)
	if err != nil {
		// Warn once per outage, not every 5 minutes; the embeddings service is
		// optional and search falls back to full-text while it's away.
		if !s.embeddingsDown.Swap(true) {
			s.log.Warn("embeddings unavailable; search uses full-text until it is back", "err", err)
		}
		return
	}
	if s.embeddingsDown.Swap(false) {
		s.log.Info("embeddings available again")
	}
	if embedded > 0 {
		s.log.Info("embedded knowledge chunks", "count", embedded, "model", s.cfg.EmbeddingModel)
	}
}

// vectorLiteral formats a vector as pgvector's text input, e.g. [0.1,0.2].
func vectorLiteral(vector []float32) string {
	var b strings.Builder
	b.Grow(len(vector) * 10)
	b.WriteByte('[')
	for i, v := range vector {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(strconv.FormatFloat(float64(v), 'g', -1, 32))
	}
	b.WriteByte(']')
	return b.String()
}
