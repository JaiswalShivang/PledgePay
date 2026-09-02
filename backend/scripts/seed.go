package main

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/google/uuid"
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
	charityRepo := repository.NewCharityRepository(gormDB)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	now := time.Now().UTC()
	demoEmail := "demo@pledgepay.dev"
	existingUser, err := userRepo.GetByEmail(ctx, demoEmail)
	if err == nil && existingUser != nil {
		slog.Info("Demo user already exists", "id", existingUser.ID, "email", existingUser.Email)
	} else {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		if err != nil {
			slog.Error("Failed to hash demo password", "error", err)
			os.Exit(1)
		}

		ghUsername := "demouser"
		demoUser := &models.User{
			ID:             uuid.New().String(),
			Email:          demoEmail,
			PasswordHash:   string(hashedPassword),
			Name:           "Demo User",
			GithubUsername: &ghUsername,
			CreatedAt:      now,
			UpdatedAt:      now,
		}

		if err := userRepo.Create(ctx, demoUser); err != nil {
			slog.Error("Failed to seed demo user", "error", err)
			os.Exit(1)
		}
		slog.Info("Demo user seeded successfully", "id", demoUser.ID, "email", demoUser.Email)
	}

	logoEdu := "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=128&q=80"
	logoFood := "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=128&q=80"
	logoHealth := "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=128&q=80"
	logoCode := "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=128&q=80"
	logoGreen := "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=128&q=80"
	siteGive := "https://giveindia.org"
	fundAcc := "fa_test_charity_fund_acc"
	contactID := "cont_test_charity_contact"

	charities := []models.Charity{
		{
			ID:                     "10000000-0000-0000-0000-000000000001",
			Name:                   "Educate Girls India",
			Category:               "education",
			Description:            "Mobilizes communities for girls' education in India's rural and educationally backward areas.",
			WebsiteURL:             &siteGive,
			LogoURL:                &logoEdu,
			RazorpayxContactID:     &contactID,
			RazorpayxFundAccountID: &fundAcc,
			IsActive:               true,
			CreatedAt:              now,
			UpdatedAt:              now,
		},
		{
			ID:                     "10000000-0000-0000-0000-000000000002",
			Name:                   "Akshaya Patra Foundation",
			Category:               "poverty",
			Description:            "Strives to eliminate classroom hunger by implementing the Mid-Day Meal Scheme in government schools.",
			WebsiteURL:             &siteGive,
			LogoURL:                &logoFood,
			RazorpayxContactID:     &contactID,
			RazorpayxFundAccountID: &fundAcc,
			IsActive:               true,
			CreatedAt:              now,
			UpdatedAt:              now,
		},
		{
			ID:                     "10000000-0000-0000-0000-000000000003",
			Name:                   "Sankara Eye Foundation",
			Category:               "health",
			Description:            "Provides high-quality, free eye care surgeries to eradicate curable blindness across rural India.",
			WebsiteURL:             &siteGive,
			LogoURL:                &logoHealth,
			RazorpayxContactID:     &contactID,
			RazorpayxFundAccountID: &fundAcc,
			IsActive:               true,
			CreatedAt:              now,
			UpdatedAt:              now,
		},
		{
			ID:                     "10000000-0000-0000-0000-000000000004",
			Name:                   "FreeCodeCamp Foundation",
			Category:               "general",
			Description:            "Creates free coding curricula and open learning resources for millions of aspiring developers worldwide.",
			WebsiteURL:             &siteGive,
			LogoURL:                &logoCode,
			RazorpayxContactID:     &contactID,
			RazorpayxFundAccountID: &fundAcc,
			IsActive:               true,
			CreatedAt:              now,
			UpdatedAt:              now,
		},
		{
			ID:                     "10000000-0000-0000-0000-000000000005",
			Name:                   "Grow-Trees India",
			Category:               "environment",
			Description:            "Plants trees in rural areas to combat deforestation, support wildlife, and generate rural employment.",
			WebsiteURL:             &siteGive,
			LogoURL:                &logoGreen,
			RazorpayxContactID:     &contactID,
			RazorpayxFundAccountID: &fundAcc,
			IsActive:               true,
			CreatedAt:              now,
			UpdatedAt:              now,
		},
	}

	for _, c := range charities {
		existingCharity, err := charityRepo.GetByID(ctx, c.ID)
		if err == nil && existingCharity != nil {
			slog.Info("Charity already exists", "name", c.Name, "id", c.ID)
			continue
		}

		if err := charityRepo.Create(ctx, &c); err != nil {
			slog.Error("Failed to seed charity", "name", c.Name, "error", err)
			continue
		}
		slog.Info("Charity seeded successfully", "name", c.Name, "id", c.ID)
	}

	slog.Info("Database seeding finished successfully")
}
