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
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	slog.Info("Starting PledgePay Backend API Service")

	cfg := config.Load()

	rootCtx, rootCancel := context.WithCancel(context.Background())
	defer rootCancel()

	var gormDB *gorm.DB
	var err error
	gormDB, err = db.InitPostgres(cfg.DatabaseURL)
	if err != nil {
		slog.Warn("PostgreSQL connection failed at boot (service will run with limited features)", "error", err)
	}

	var rdb *redis.Client
	rdb, err = db.InitRedis(cfg.RedisURL)
	if err != nil {
		slog.Warn("Redis connection failed at boot (service will run with limited features)", "error", err)
	}

	srvInstance := server.New(cfg, gormDB, rdb)
	srvInstance.StartSettlementWorker(rootCtx)

	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      srvInstance.Router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("Server listening on port", "port", cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("HTTP server failed to listen and serve", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	sig := <-quit
	slog.Info("Received shutdown signal, initiating graceful shutdown...", "signal", sig.String())

	rootCancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
	}

	if gormDB != nil {
		if sqlDB, err := gormDB.DB(); err == nil {
			_ = sqlDB.Close()
		}
	}

	if rdb != nil {
		_ = rdb.Close()
	}

	slog.Info("PledgePay API server exited cleanly", "timestamp", time.Now().UTC().Format(time.RFC3339))
	_ = rootCtx
}
