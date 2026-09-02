package main

import (
	"fmt"
	"log"

	"github.com/jaiswalshivang/pledgepay/internal/config"
	"github.com/jaiswalshivang/pledgepay/internal/db"
)

func main() {
	cfg := config.Load()
	database, err := db.InitPostgres(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to db: %v", err)
	}

	tx := database.Begin()

	tx.Exec("TRUNCATE TABLE webhook_events, donations, verification_results, evidence, payments, commitment_rules, commitments, integrations, users, charities CASCADE")

	if err := tx.Commit().Error; err != nil {
		log.Fatalf("failed to empty database: %v", err)
	}

	fmt.Println("Database completely emptied. All tables have been truncated.")
}
