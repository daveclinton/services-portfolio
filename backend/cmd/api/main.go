// Command api is the portfolio backend: one binary that serves every product
// built on the VPS behind nginx.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/daveclinton/portfolio/backend/internal/askai"
	"github.com/daveclinton/portfolio/backend/internal/config"
	"github.com/daveclinton/portfolio/backend/internal/newsletter"
	"github.com/daveclinton/portfolio/backend/internal/server"
	"github.com/daveclinton/portfolio/backend/internal/studio"
)

func main() {
	// `portfolio-api healthcheck` lets Docker probe the server without curl
	// in the image.
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		os.Exit(healthcheck())
	}
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(log); err != nil {
		log.Error("api stopped", "err", err)
		os.Exit(1)
	}
}

func healthcheck() int {
	_, port, err := net.SplitHostPort(os.Getenv("ADDR"))
	if err != nil {
		port = "8080"
	}
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get("http://127.0.0.1:" + port + "/healthz")
	if err != nil {
		return 1
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}

func run(log *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	// Stop on Ctrl-C locally or SIGTERM from Docker.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer db.Close()
	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	err = db.Ping(pingCtx)
	cancel()
	if err != nil {
		return errors.Join(errors.New("connect to database"), err)
	}

	askAI := askai.New(cfg, db, log)
	if err := askAI.Init(ctx); err != nil {
		return errors.Join(errors.New("prepare ask-ai schema"), err)
	}
	go askAI.Run(ctx)
	subscriptions := newsletter.New(cfg, log)
	go subscriptions.Run(ctx)
	newsletterStudio := studio.New(cfg, db, log, subscriptions.ListIDs)
	if err := newsletterStudio.Init(ctx); err != nil {
		return errors.Join(errors.New("prepare newsletter dashboard"), err)
	}

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           server.New(db, cfg.AllowedOrigins, log, askAI, subscriptions, newsletterStudio),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		// No WriteTimeout: chat answers stream for up to a minute. Each
		// handler bounds its own work with a context deadline instead.
		IdleTimeout: 120 * time.Second,
	}

	errs := make(chan error, 1)
	go func() {
		log.Info("api listening", "addr", cfg.Addr, "env", cfg.Env)
		errs <- srv.ListenAndServe()
	}()

	select {
	case err := <-errs:
		return err
	case <-ctx.Done():
	}

	log.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 70*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}
	askAI.Wait() // finish storing the last conversations before exiting
	return nil
}
