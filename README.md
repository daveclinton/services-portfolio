# Portfolio + Ask AI

A developer portfolio with an AI assistant that answers from verified work. Built with Next.js, Go, PostgreSQL and pgvector.

[Live site](https://www.daveclintonn.cc) · [Ask AI](https://www.daveclintonn.cc/ask-ai)

## Features

- **Ask AI:** answers questions with sources, compares job descriptions, and drafts interview and project briefs.
- **Writing desk:** a private editor for posts and newsletters.
- **Newsletter:** confirmed email signup, scheduled sending and unsubscribe.
- **Blog:** articles with RSS, light and dark themes.

## Quick start

You need Node.js 22.18+, pnpm, Docker and Python 3.12+. Go 1.27.3+ is only needed to run or test the API outside Docker.

```bash
git clone https://github.com/daveclinton/services-portfolio.git
cd services-portfolio
pnpm install
cp .env.example .env.local
cp backend/.env.example backend/.env
```

Start the API and database:

```bash
make -C backend up
```

Load the knowledge base:

```bash
python3 -m venv knowledge-backend/.venv
knowledge-backend/.venv/bin/pip install -r knowledge-backend/requirements.txt
make -C backend db-ingest
```

Start the site:

```bash
pnpm dev
```

Open http://localhost:3000. Add `OPENAI_API_KEY` to `backend/.env` for generated answers. Without it, Ask AI shows excerpts from the knowledge base.

## Make it your own

| Change | Where |
| --- | --- |
| Name, links and copy | `lib/portfolio-data.ts` |
| Home page | `app/page.tsx`, `public/` |
| Articles | `/admin/posts`; originals in `content/blog/` |
| Colors and type | `app/globals.css` |
| Assistant knowledge | `professional-knowledge/knowledge/`, then run `make -C backend db-ingest` |
| Assistant facts and rules | `backend/internal/askai/site_facts.md`, `generation.go` |

Replace the included personal content before publishing your own copy.

## Test

```bash
pnpm lint
pnpm test
pnpm build
make -C backend test
```

## More

- [API and configuration](backend/README.md)
- [Deployment](backend/deploy/README.md)
- [Knowledge pipeline](knowledge-backend/README.md)
- [Answer evaluations](backend/evals/README.md)

Conversations are stored only with consent and deleted after 30 days. See the [privacy page](https://www.daveclintonn.cc/privacy), and adapt it to your own deployment.

## Contributing

Focused pull requests are welcome. Read [AGENTS.md](AGENTS.md), run the tests, and keep credentials and private conversations out of issues and logs. Report security problems privately through the maintainer's GitHub profile.

## License

[MIT](LICENSE). Third-party components keep their own licenses, including [Prompt Kit](components/prompt-kit/README.md).
