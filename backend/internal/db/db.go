package db

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func InitPostgres(databaseURL string) (*gorm.DB, error) {
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	}

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  databaseURL,
		PreferSimpleProtocol: true,
	}), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to postgres: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get generic database object: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	slog.Info("PostgreSQL connection established successfully")
	_ = db.Exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS codeforces_username VARCHAR(255);").Error
	_ = db.Exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';").Error
	_ = db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_commitment_source ON evidence (commitment_id, source_ref);").Error
	_ = db.Exec("ALTER TABLE donations ADD COLUMN IF NOT EXISTS failure_reason TEXT;").Error
	_ = db.Exec("ALTER TABLE donations ADD COLUMN IF NOT EXISTS razorpayx_payout_id VARCHAR(255);").Error
	_ = db.Exec("ALTER TABLE charities ADD COLUMN IF NOT EXISTS website_url VARCHAR(500) DEFAULT 'https://giveindia.org';").Error
	_ = db.Exec("ALTER TABLE charities ADD COLUMN IF NOT EXISTS razorpayx_contact_id VARCHAR(255) DEFAULT 'cont_test_charity';").Error
	return db, nil
}

func InitRedis(redisURL string) (*redis.Client, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid redis url: %w", err)
	}

	rdb := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping redis: %w", err)
	}

	slog.Info("Redis connection established successfully")
	return rdb, nil
}
