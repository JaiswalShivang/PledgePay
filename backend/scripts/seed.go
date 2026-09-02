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
	charityRepo := repository.NewCharityRepository(gormDB)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

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
			Email:          demoEmail,
			PasswordHash:   string(hashedPassword),
			Name:           "Demo User",
			GithubUsername: &ghUsername,
		}

		if err := userRepo.Create(ctx, demoUser); err != nil {
			slog.Error("Failed to seed demo user", "error", err)
			os.Exit(1)
		}
		slog.Info("Demo user seeded successfully", "id", demoUser.ID, "email", demoUser.Email)
	}

	existingCharities, err := charityRepo.ListActive(ctx)
	if err == nil && len(existingCharities) > 0 {
		slog.Info("Charities already seeded", "count", len(existingCharities))
		fmt.Printf("Seed complete: %d active charities found.\n", len(existingCharities))
		return
	}

	logoEdu := "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=128&q=80"
	logoFood := "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=128&q=80"
	logoHealth := "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=128&q=80"
	logoCode := "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=128&q=80"
	logoGreen := "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=128&q=80"

	fa1 := "fa_edu_demo_101"
	fa2 := "fa_food_demo_102"
	fa3 := "fa_health_demo_103"
	fa4 := "fa_code_demo_104"
	fa5 := "fa_green_demo_105"

	charitiesToSeed := []models.Charity{
		{
			Name:                   "Pratham Education Foundation",
			Category:               "Education & Literacy",
			Description:            "Dedicated to improving the quality of education and foundational learning for underprivileged children across India.",
			LogoURL:                &logoEdu,
			IsActive:               true,
			RazorpayxFundAccountID: &fa1,
		},
		{
			Name:                   "Akshaya Patra Foundation",
			Category:               "Hunger Relief & Nutrition",
			Description:            "Eliminating classroom hunger by feeding nutritious mid-day meals to millions of government school children daily.",
			LogoURL:                &logoFood,
			IsActive:               true,
			RazorpayxFundAccountID: &fa2,
		},
		{
			Name:                   "GiveIndia Critical Health Fund",
			Category:               "Healthcare & Medical Aid",
			Description:            "Funding emergency surgeries, pediatric ICU care, and life-saving treatments for families below the poverty line.",
			LogoURL:                &logoHealth,
			IsActive:               true,
			RazorpayxFundAccountID: &fa3,
		},
		{
			Name:                   "Code.org & Tech Empowerment",
			Category:               "Computer Science & Tech Access",
			Description:            "Democratizing access to programming education, open source tooling, and tech careers for underrepresented youth.",
			LogoURL:                &logoCode,
			IsActive:               true,
			RazorpayxFundAccountID: &fa4,
		},
		{
			Name:                   "Clean Planet & Reforestation Fund",
			Category:               "Climate & Environment",
			Description:            "Restoring native forests, protecting vital river ecosystems, and funding community-led renewable solar projects.",
			LogoURL:                &logoGreen,
			IsActive:               true,
			RazorpayxFundAccountID: &fa5,
		},
	}

	for _, ch := range charitiesToSeed {
		item := ch
		if err := charityRepo.Create(ctx, &item); err != nil {
			slog.Error("Failed to seed charity", "name", item.Name, "error", err)
		} else {
			slog.Info("Seeded charity", "id", item.ID, "name", item.Name, "category", item.Category)
		}
	}

	fmt.Println("Seed completed successfully with demo user and charities.")
}
