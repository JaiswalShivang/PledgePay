package main

import (
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jaiswalshivang/pledgepay/internal/config"
	"github.com/jaiswalshivang/pledgepay/internal/db"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.Load()
	database, err := db.InitPostgres(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to db: %v", err)
	}

	tx := database.Begin()

	hash, _ := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.DefaultCost)
	demoUser := models.User{
		ID:           "a0000000-0000-0000-0000-000000000001",
		Email:        "demo@pledgepay.io",
		PasswordHash: string(hash),
		Name:         "Shivang Jaiswal (Demo)",
	}

	tx.Save(&demoUser)

	var charities []models.Charity
	tx.Where("is_active = ?", true).Find(&charities)
	if len(charities) == 0 {
		tx.Rollback()
		log.Fatal("no active charities found")
	}

	charity1 := charities[0]
	charity2 := charities[0]
	if len(charities) > 1 {
		charity2 = charities[1]
	}

	tx.Exec("DELETE FROM donations WHERE commitment_id IN (SELECT id FROM commitments WHERE user_id = ?)", demoUser.ID)
	tx.Exec("DELETE FROM verification_results WHERE commitment_id IN (SELECT id FROM commitments WHERE user_id = ?)", demoUser.ID)
	tx.Exec("DELETE FROM evidence WHERE commitment_id IN (SELECT id FROM commitments WHERE user_id = ?)", demoUser.ID)
	tx.Exec("DELETE FROM payments WHERE commitment_id IN (SELECT id FROM commitments WHERE user_id = ?)", demoUser.ID)
	tx.Exec("DELETE FROM commitment_rules WHERE commitment_id IN (SELECT id FROM commitments WHERE user_id = ?)", demoUser.ID)
	tx.Exec("DELETE FROM commitments WHERE user_id = ?", demoUser.ID)

	now := time.Now().UTC()
	startDate1 := now.Add(-5 * 24 * time.Hour)
	endDate1 := now.Add(15 * 24 * time.Hour)
	score1 := 95.0
	repo1 := "demo-developer/dsa-daily-challenge"

	comm1 := models.Commitment{
		ID:           "c0000000-0000-0000-0000-000000000001",
		UserID:       demoUser.ID,
		CharityID:    &charity1.ID,
		GithubRepo:   &repo1,
		Title:        "20 DSA Algorithmic Problems in 20 Days",
		Description:  stringPtr("Solve and commit 20 LeetCode Medium/Hard algorithmic challenges with clean code and time complexity analysis."),
		TargetCount:  20,
		Unit:         "problems",
		DurationDays: 20,
		StartDate:    startDate1,
		EndDate:      endDate1,
		EvidenceType: "github_activity",
		AmountPaise:  200000,
		Status:       "ACTIVE",
		QualityScore: &score1,
		CreatedAt:    startDate1,
		UpdatedAt:    now,
	}
	tx.Create(&comm1)

	pay1 := models.Payment{
		ID:                "p0000000-0000-0000-0000-000000000001",
		CommitmentID:      comm1.ID,
		RazorpayOrderID:   "order_demo_dsa_2000",
		RazorpayPaymentID: stringPtr("pay_demo_verified_success_2000"),
		AmountPaise:       200000,
		Currency:          "INR",
		Status:            "CAPTURED",
		CreatedAt:         startDate1,
		UpdatedAt:         startDate1,
	}
	tx.Create(&pay1)

	problems := []string{
		"Two Sum II - Input Array Is Sorted",
		"3Sum - Optimal Two Pointer Search",
		"Container With Most Water",
		"Longest Substring Without Repeating Characters",
		"Minimum Window Substring",
		"Valid Anagram & Group Anagrams",
		"Top K Frequent Elements",
		"Product of Array Except Self",
		"Longest Consecutive Sequence",
		"Valid Palindrome",
		"Binary Search - Rotated Sorted Array",
		"Search a 2D Matrix",
	}

	for i, prob := range problems {
		evTime := startDate1.Add(time.Duration(i*10) * time.Hour)
		ev := models.Evidence{
			ID:           uuid.New().String(),
			CommitmentID: comm1.ID,
			Source:       "github_commit",
			SourceRef:    fmt.Sprintf("sha_%04d_prob_%d", i+1, i+1),
			RawPayload: models.JSONB{
				"sha":     fmt.Sprintf("e4b%03x", i+100),
				"message": fmt.Sprintf("feat(dsa): solve %s", prob),
				"author":  "demo-developer",
				"url":     fmt.Sprintf("https://github.com/demo-developer/dsa-daily-challenge/commit/e4b%03x", i+100),
			},
			OccurredAt: evTime,
			IngestedAt: evTime,
		}
		tx.Create(&ev)
	}

	startDate2 := now.Add(-10 * 24 * time.Hour)
	endDate2 := now.Add(2 * 24 * time.Hour)
	score2 := 90.0
	repo2 := "demo-developer/open-source-contributions"

	comm2 := models.Commitment{
		ID:           "c0000000-0000-0000-0000-000000000002",
		UserID:       demoUser.ID,
		CharityID:    &charity2.ID,
		GithubRepo:   &repo2,
		Title:        "10 Open Source Pull Requests in 12 Days",
		Description:  stringPtr("Contribute 10 bug fixes and documentation enhancements to open source web libraries."),
		TargetCount:  10,
		Unit:         "prs",
		DurationDays: 12,
		StartDate:    startDate2,
		EndDate:      endDate2,
		EvidenceType: "github_activity",
		AmountPaise:  100000,
		Status:       "ACTIVE",
		QualityScore: &score2,
		CreatedAt:    startDate2,
		UpdatedAt:    now,
	}
	tx.Create(&comm2)

	pay2 := models.Payment{
		ID:                "p0000000-0000-0000-0000-000000000002",
		CommitmentID:      comm2.ID,
		RazorpayOrderID:   "order_demo_oss_1000",
		RazorpayPaymentID: stringPtr("pay_demo_verified_success_1000"),
		AmountPaise:       100000,
		Currency:          "INR",
		Status:            "CAPTURED",
		CreatedAt:         startDate2,
		UpdatedAt:         startDate2,
	}
	tx.Create(&pay2)

	for i := 1; i <= 3; i++ {
		evTime := startDate2.Add(time.Duration(i*24) * time.Hour)
		ev := models.Evidence{
			ID:           uuid.New().String(),
			CommitmentID: comm2.ID,
			Source:       "github_pr",
			SourceRef:    fmt.Sprintf("pr_merge_%d", i),
			RawPayload: models.JSONB{
				"number": i,
				"title":  fmt.Sprintf("fix(core): patch memory leak in buffer handler #%d", i),
				"author": "demo-developer",
				"state":  "closed",
				"merged": true,
				"url":    fmt.Sprintf("https://github.com/demo-developer/open-source-contributions/pull/%d", i),
			},
			OccurredAt: evTime,
			IngestedAt: evTime,
		}
		tx.Create(&ev)
	}

	tx.Commit()

	fmt.Printf("Demo environment seeded successfully:\nUser: demo@pledgepay.io / Password123!\nPrimary Commitment (12/20 ON TRACK): %s\nSecond Commitment (3/10 ACTIVE): %s\n", comm1.ID, comm2.ID)
}

func stringPtr(s string) *string {
	return &s
}
