package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/payout"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type DevHandler struct {
	db       *gorm.DB
	resolver *payout.Resolver
	demoMode bool
}

func NewDevHandler(db *gorm.DB, resolver *payout.Resolver, demoMode bool) *DevHandler {
	return &DevHandler{
		db:       db,
		resolver: resolver,
		demoMode: demoMode,
	}
}

type DevActionRequest struct {
	CommitmentID string `json:"commitment_id"`
}

func (h *DevHandler) ResetDemo(c *gin.Context) {
	tx := h.db.Begin()

	var demoUser models.User
	err := tx.Where("email = ?", "demo@pledgepay.io").First(&demoUser).Error
	if err != nil {
		hash, _ := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.DefaultCost)
		demoUser = models.User{
			ID:           "a0000000-0000-0000-0000-000000000001",
			Email:        "demo@pledgepay.io",
			PasswordHash: string(hash),
			Name:         "Shivang Jaiswal (Demo)",
		}
		if err := tx.Create(&demoUser).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create demo user"})
			return
		}
	}

	var charities []models.Charity
	tx.Where("is_active = ?", true).Find(&charities)
	if len(charities) == 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "no active charities found in database"})
		return
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
	if err := tx.Create(&comm1).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create primary demo commitment"})
		return
	}

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
	_ = tx.Create(&pay1)

	problems := []string{
		"Two Sum II - Input Array Is Sorted (O(N) Two Pointers)",
		"3Sum - Optimal Two Pointer Search",
		"Container With Most Water (Greedy Traversal)",
		"Longest Substring Without Repeating Characters (Sliding Window)",
		"Minimum Window Substring (HashMap Frequency Match)",
		"Valid Anagram & Group Anagrams (Bucket Hash)",
		"Top K Frequent Elements (Min Heap Priority Queue)",
		"Product of Array Except Self (Prefix & Suffix Pass)",
		"Longest Consecutive Sequence (HashSet O(N))",
		"Valid Palindrome (Alphanumeric Filter)",
		"Binary Search - Rotated Sorted Array (Modified Pivot)",
		"Search a 2D Matrix (Flattened Binary Search)",
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
		_ = tx.Create(&ev)
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
	_ = tx.Create(&comm2)

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
	_ = tx.Create(&pay2)

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
		_ = tx.Create(&ev)
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"message":               "Demo state reset successfully",
		"primary_commitment_id": comm1.ID,
		"second_commitment_id":  comm2.ID,
		"seeded_evidence_count": 12,
		"demo_user_email":       demoUser.Email,
	})
}

func (h *DevHandler) InjectAnomaly(c *gin.Context) {
	var req DevActionRequest
	_ = c.ShouldBindJSON(&req)

	commitmentID := req.CommitmentID
	if commitmentID == "" {
		commitmentID = "c0000000-0000-0000-0000-000000000001"
	}

	now := time.Now().UTC()
	for i := 1; i <= 8; i++ {
		burstTime := now.Add(time.Duration(i*8) * time.Second)
		ev := models.Evidence{
			ID:           uuid.New().String(),
			CommitmentID: commitmentID,
			Source:       "github_commit",
			SourceRef:    fmt.Sprintf("sha_burst_anomaly_%d_%d", now.Unix(), i),
			RawPayload: models.JSONB{
				"sha":     fmt.Sprintf("anomaly_%x", i),
				"message": fmt.Sprintf("rapid auto-commit patch #%d", i),
				"author":  "demo-developer",
				"url":     "https://github.com/demo-developer/dsa-daily-challenge/commit/anomaly",
			},
			OccurredAt: burstTime,
			IngestedAt: burstTime,
		}
		h.db.Create(&ev)
	}

	verifSnapshot := models.VerificationResult{
		CommitmentID:  commitmentID,
		EvidenceCount: 20,
		VerifiedCount: 20,
		ProgressPct:   100.0,
		AnomalyFlag:   true,
		AnomalyReason: stringPtr("Suspicious burst detected: 8 evidence items created within 64 seconds of each other."),
		AIConfidence:  float64Ptr(85.0),
		AISummary: models.JSONB{
			"evidence_quality": "LOW",
			"anomaly":          "SUSPICIOUS_CLUSTERING",
			"summary":          "Automated timing anomaly flagged: unnatural rapid burst of commit activity violating authentic developer cadence.",
		},
		CreatedAt: now,
	}
	h.db.Create(&verifSnapshot)

	c.JSON(http.StatusOK, gin.H{
		"message":       "Anomaly burst injected successfully (8 items in 64s)",
		"commitment_id": commitmentID,
		"anomaly_flag":  true,
		"anomaly_type":  "SUSPICIOUS_CLUSTERING",
	})
}

func (h *DevHandler) ForceSuccess(c *gin.Context) {
	var req DevActionRequest
	_ = c.ShouldBindJSON(&req)

	commitmentID := req.CommitmentID
	if commitmentID == "" {
		commitmentID = "c0000000-0000-0000-0000-000000000001"
	}

	h.db.Exec("DELETE FROM verification_results WHERE commitment_id = ? AND anomaly_flag = true", commitmentID)

	var currentCount int64
	h.db.Model(&models.Evidence{}).Where("commitment_id = ?", commitmentID).Count(&currentCount)

	needed := 20 - int(currentCount)
	now := time.Now().UTC()
	for i := 1; i <= needed; i++ {
		evTime := now.Add(time.Duration(-i*4) * time.Hour)
		ev := models.Evidence{
			ID:           uuid.New().String(),
			CommitmentID: commitmentID,
			Source:       "github_commit",
			SourceRef:    fmt.Sprintf("sha_clean_finish_%d", i),
			RawPayload: models.JSONB{
				"sha":     fmt.Sprintf("clean_%03d", i),
				"message": fmt.Sprintf("feat(dsa): verified solution problem #%d", int(currentCount)+i),
				"author":  "demo-developer",
				"url":     "https://github.com/demo-developer/dsa-daily-challenge",
			},
			OccurredAt: evTime,
			IngestedAt: evTime,
		}
		h.db.Create(&ev)
	}

	res, err := h.resolver.ResolveCommitment(c.Request.Context(), commitmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Commitment successfully resolved to COMPLETED with RazorpayX payout",
		"resolution": res,
	})
}

func (h *DevHandler) ForceFailure(c *gin.Context) {
	var req DevActionRequest
	_ = c.ShouldBindJSON(&req)

	commitmentID := req.CommitmentID
	if commitmentID == "" {
		commitmentID = "c0000000-0000-0000-0000-000000000002"
	}

	pastDate := time.Now().UTC().Add(-48 * time.Hour)
	h.db.Model(&models.Commitment{}).Where("id = ?", commitmentID).Updates(map[string]interface{}{
		"end_date": pastDate,
	})

	res, err := h.resolver.ResolveCommitment(c.Request.Context(), commitmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Commitment expired and resolved to FAILED with automated impact donation",
		"resolution": res,
	})
}

func stringPtr(s string) *string {
	return &s
}

func float64Ptr(f float64) *float64 {
	return &f
}
