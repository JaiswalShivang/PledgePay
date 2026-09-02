package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/jaiswalshivang/pledgepay/internal/config"
	"github.com/jaiswalshivang/pledgepay/internal/db"
)

func main() {
	action := flag.String("action", "up", "Migration action: up or down")
	flag.Parse()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	cfg := config.Load()
	gormDB, err := db.InitPostgres(cfg.DatabaseURL)
	if err != nil {
		slog.Error("Failed to connect to database for migration", "error", err)
		os.Exit(1)
	}

	sqlDB, err := gormDB.DB()
	if err != nil {
		slog.Error("Failed to get raw DB", "error", err)
		os.Exit(1)
	}
	defer sqlDB.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	candidates := []string{"migrations", filepath.Join("backend", "migrations"), filepath.Join("..", "migrations")}
	var migDir string
	for _, c := range candidates {
		if stat, err := os.Stat(c); err == nil && stat.IsDir() {
			migDir = c
			break
		}
	}

	if migDir == "" {
		slog.Error("Could not find migrations directory")
		os.Exit(1)
	}

	entries, err := os.ReadDir(migDir)
	if err != nil {
		slog.Error("Failed to read migrations directory", "error", err)
		os.Exit(1)
	}

	suffix := ".up.sql"
	if *action == "down" {
		suffix = ".down.sql"
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), suffix) {
			files = append(files, filepath.Join(migDir, e.Name()))
		}
	}

	if *action == "down" {
		sort.Sort(sort.Reverse(sort.StringSlice(files)))
	} else {
		sort.Strings(files)
	}

	for _, f := range files {
		sqlBytes, err := os.ReadFile(f)
		if err != nil {
			slog.Error("Failed to read migration file", "file", f, "error", err)
			os.Exit(1)
		}

		slog.Info("Running migration file", "path", f, "action", *action)
		queries := strings.Split(string(sqlBytes), ";")
		for _, q := range queries {
			q = strings.TrimSpace(q)
			if q == "" {
				continue
			}
			if _, err := sqlDB.ExecContext(ctx, q); err != nil {
				slog.Error("Failed to execute SQL statement", "file", f, "query", q, "error", err)
				os.Exit(1)
			}
		}
	}

	slog.Info("All migrations completed successfully", "action", *action, "total_files", len(files))
	fmt.Printf("Applied %d migration file(s) successfully.\n", len(files))
}
