// Command newsletter-import loads an exported list into the application's
// database. It never sends email or contacts either the old or new provider.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/sendy"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	path := flag.String("file", "", "CSV with email,status,confirmed_at columns")
	flag.Parse()
	if *path == "" || os.Getenv("DATABASE_URL") == "" {
		fmt.Fprintln(os.Stderr, "Use -file export.csv and set DATABASE_URL.")
		os.Exit(1)
	}
	if err := run(*path); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
func run(path string) error {
	input, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open subscriber export")
	}
	defer input.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	db, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return fmt.Errorf("configure subscriber database")
	}
	defer db.Close()
	client := sendy.NewNewsletter("", db, sendy.Address{}, "", "", "")
	if err = client.Init(ctx); err != nil {
		return fmt.Errorf("prepare subscriber database")
	}
	count, err := client.ImportSubscribers(ctx, input)
	if err != nil {
		return err
	}
	fmt.Printf("Imported %d rows. No email was sent.\n", count)
	return nil
}
