package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jaiswalshivang/pledgepay/internal/config"
	"github.com/jaiswalshivang/pledgepay/internal/db"
	"github.com/jaiswalshivang/pledgepay/internal/server"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func main() {
	// Initialize structured logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	slog.Info("Starting PledgePay Backend API Service")

	// Load configuration
	cfg := config.Load()

	// Root context with cancellation for graceful shutdown
	rootCtx, rootCancel := context.WithCancel(context.Background())
	defer rootCancel()

	// Connect to PostgreSQL (log warning if offline during initial boot, but allow server startup)
	var gormDB *gorm.DB
	var err error
	gormDB, err = db.InitPostgres(cfg.DatabaseURL)
	if err != nil {
		slog.Warn("PostgreSQL connection failed at boot (service will run with limited features)", "error", err)
	}

	// Connect to Redis
	var rdb *redis.Client
	rdb, err = db.InitRedis(cfg.RedisURL)
	if err != nil {
		slog.Warn("Redis connection failed at boot (service will run with limited features)", "error", err)
	}

	// Initialize Gin Server
	srvInstance := server.New(cfg, gormDB, rdb)

	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      srvInstance.Router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Run HTTP Server in a background goroutine
	go func() {
		slog.Info("Server listening on port", "port", cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("HTTP server failed to listen and serve", "error", err)
			os.Exit(1)
		}
	}()

	// Listen for shutdown signals (SIGINT, SIGTERM)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	sig := <-quit
	slog.Info("Received shutdown signal, initiating graceful shutdown...", "signal", sig.String())

	// Cancel root context to signal all background goroutines
	rootCancel()

	// Create shutdown context with 10s deadline
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	// Gracefully shutdown HTTP server
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
	}

	// Close database connections
	if gormDB != nil {
		if sqlDB, err := gormDB.DB(); err == nil {
			_ = sqlDB.Close()
		}
	}

	// Close Redis connection
	if rdb != nil {
		_ = rdb.Close()
	}

	slog.Info("PledgePay API server exited cleanly", "timestamp", time.Now().UTC().Format(time.RFC3339))
	_ = rootCtx // rootCtx used for lifecycle
}
