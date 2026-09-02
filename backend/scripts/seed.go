package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/jaiswalshivang/pledgepay/internal/config"
	"github.com/jaiswalshivang/pledgepay/internal/db"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	cfg := config.Load()
	gormDB, err := db.InitPostgres(cfg.DatabaseURL)
	if err != nil {
		slog.Error("Database connection failed for seed script", "error", err)
		os.Exit(1)
	}

	userRepo := repository.NewUserRepository(gormDB)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	demoEmail := "demo@pledgepay.dev"
	existingUser, err := userRepo.GetByEmail(ctx, demoEmail)
	if err == nil && existingUser != nil {
		slog.Info("Demo user already exists", "id", existingUser.ID, "email", existingUser.Email)
		fmt.Printf("Seed completed: Demo user found (ID: %s, Email: %s)\n", existingUser.ID, existingUser.Email)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		slog.Error("Failed to hash demo password", "error", err)
		os.Exit(1)
	}

	ghUsername := "demouser"
	demoUser := &models.User{
		Email:          demoEmail,
		PasswordHash:   string(hashedPassword),
		Name:           "Demo User",
		GithubUsername: &ghUsername,
	}

	if err := userRepo.Create(ctx, demoUser); err != nil {
		slog.Error("Failed to seed demo user", "error", err)
		os.Exit(1)
	}

	retrieved, err := userRepo.GetByID(ctx, demoUser.ID)
	if err != nil {
		slog.Error("Failed to query back seeded demo user", "error", err)
		os.Exit(1)
	}

	slog.Info("Demo user seeded successfully", "id", retrieved.ID, "email", retrieved.Email, "name", retrieved.Name)
	fmt.Printf("Seed successful! Created demo user ID: %s, Email: %s, Name: %s\n", retrieved.ID, retrieved.Email, retrieved.Name)
}
