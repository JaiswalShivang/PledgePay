package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
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

	var fileName string
	if *action == "down" {
		fileName = "000001_init_schema.down.sql"
	} else {
		fileName = "000001_init_schema.up.sql"
	}

	searchPaths := []string{
		filepath.Join("migrations", fileName),
		filepath.Join("backend", "migrations", fileName),
		filepath.Join("..", "migrations", fileName),
	}

	var sqlBytes []byte
	var foundPath string
	for _, p := range searchPaths {
		if content, err := os.ReadFile(p); err == nil {
			sqlBytes = content
			foundPath = p
			break
		}
	}

	if len(sqlBytes) == 0 {
		slog.Error("Could not find migration file", "file", fileName)
		os.Exit(1)
	}

	slog.Info("Running migration file", "path", foundPath, "action", *action)

	queries := strings.Split(string(sqlBytes), ";")
	for _, q := range queries {
		q = strings.TrimSpace(q)
		if q == "" {
			continue
		}
		if _, err := sqlDB.ExecContext(ctx, q); err != nil {
			slog.Error("Failed to execute SQL statement", "query", q, "error", err)
			os.Exit(1)
		}
	}

	slog.Info("Migration completed successfully", "action", *action)
	fmt.Printf("Migration '%s' applied successfully.\n", *action)
}
