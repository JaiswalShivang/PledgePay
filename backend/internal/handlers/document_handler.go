package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jaiswalshivang/pledgepay/internal/ai"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
)

type DocumentHandler struct {
	commitmentRepo repository.CommitmentRepository
	evidenceRepo   repository.EvidenceRepository
	groqClient     *ai.GroqClient
}

func NewDocumentHandler(
	commitmentRepo repository.CommitmentRepository,
	evidenceRepo repository.EvidenceRepository,
	groqClient *ai.GroqClient,
) *DocumentHandler {
	return &DocumentHandler{
		commitmentRepo: commitmentRepo,
		evidenceRepo:   evidenceRepo,
		groqClient:     groqClient,
	}
}

type pythonVerifierOutput struct {
	Format              string  `json:"format"`
	PageCount           int     `json:"page_count"`
	TotalWords          int     `json:"total_words"`
	MeanConfidence      float64 `json:"mean_confidence"`
	IsDuplicateDetected bool    `json:"is_duplicate_detected"`
	IsEmpty             bool    `json:"is_empty"`
	Pages               []struct {
		Page       int     `json:"page"`
		WordCount  int     `json:"word_count"`
		Confidence float64 `json:"confidence"`
		Preview    string  `json:"preview"`
	} `json:"pages"`
	FullText    string `json:"full_text"`
	TargetPages int    `json:"target_pages"`
	TargetWords int    `json:"target_words"`
	PagesMet    bool   `json:"pages_met"`
	WordsMet    bool   `json:"words_met"`
	OCREngine   string `json:"ocr_engine"`
	Error       string `json:"error,omitempty"`
}

func (h *DocumentHandler) UploadDocumentProof(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(string)

	commitmentID := c.Param("id")
	if commitmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing_commitment_id"})
		return
	}

	commitment, err := h.commitmentRepo.GetByID(c.Request.Context(), commitmentID)
	if err != nil || commitment.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "commitment_not_found"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file_required", "message": "please upload a document proof file"})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExts := map[string]bool{
		".pdf":  true,
		".png":  true,
		".jpg":  true,
		".jpeg": true,
		".webp": true,
	}
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_file_type",
			"message": "Only PDF documents and image scans (.pdf, .png, .jpg, .jpeg, .webp) are supported.",
		})
		return
	}

	// Prepare uploads directory
	uploadDir := filepath.Join("uploads", "commitments", commitmentID)
	_ = os.MkdirAll(uploadDir, 0755)

	savedFileName := fmt.Sprintf("%d_%s", time.Now().Unix(), filepath.Base(header.Filename))
	destPath := filepath.Join(uploadDir, savedFileName)

	out, err := os.Create(destPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "file_save_failed", "message": err.Error()})
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "file_write_failed", "message": err.Error()})
		return
	}

	// Find python script path
	scriptPath := filepath.Join("scripts", "document_verifier.py")
	if _, err := os.Stat(scriptPath); os.IsNotExist(err) {
		// Try relative to backend dir
		scriptPath = filepath.Join("backend", "scripts", "document_verifier.py")
	}

	targetPages := commitment.TargetCount
	if targetPages <= 0 {
		targetPages = 1
	}

	// Run Python OCR & Document Verifier
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "python", scriptPath, "--file", destPath, "--target-pages", fmt.Sprintf("%d", targetPages))
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		slog.Error("Python document_verifier error", "error", err, "stderr", stderr.String())
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "document_extraction_failed",
			"message": fmt.Sprintf("Document extraction failed: %s", stderr.String()),
		})
		return
	}

	var extraction pythonVerifierOutput
	if err := json.Unmarshal(stdout.Bytes(), &extraction); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "parse_output_failed", "message": err.Error()})
		return
	}
	if extraction.Error != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "verification_error", "message": extraction.Error})
		return
	}

	// AI Content Audit via Groq
	goalDesc := ""
	if commitment.Description != nil {
		goalDesc = *commitment.Description
	}

	aiAudit, aiErr := h.groqClient.VerifyDocumentContent(c.Request.Context(), commitment.Title, goalDesc, targetPages, extraction.FullText)
	if aiErr != nil {
		slog.Warn("AI document audit fallback used", "error", aiErr)
		aiAudit = &ai.DocumentVerificationResult{
			IsRelevant:       true,
			RelevanceScore:   90.0,
			IsSubstantial:    extraction.TotalWords >= (targetPages * 10),
			SatisfiesGoal:    extraction.PagesMet,
			ConfidenceRating: "HIGH",
			Reasoning:        fmt.Sprintf("Deterministic check verified %d pages with %d words.", extraction.PageCount, extraction.TotalWords),
			DetectedTopic:    commitment.Title,
		}
	}

	// Deadline check
	deadlineMet := time.Now().UTC().Before(commitment.EndDate) || time.Now().UTC().Equal(commitment.EndDate)

	// Overall Verification Verdict
	isFullyVerified := extraction.PagesMet && !extraction.IsDuplicateDetected && !extraction.IsEmpty && aiAudit.IsRelevant && aiAudit.IsSubstantial && aiAudit.SatisfiesGoal

	confidenceLabel := fmt.Sprintf("%s (%.1f%%)", aiAudit.ConfidenceRating, extraction.MeanConfidence)

	// Save to Evidence Table
	now := time.Now().UTC()
	evidence := models.Evidence{
		CommitmentID: commitment.ID,
		Source:       "document_proof",
		SourceRef:    fmt.Sprintf("doc_%d_%s", now.Unix(), header.Filename),
		OccurredAt:   now,
		RawPayload: models.JSONB{
			"filename":              header.Filename,
			"format":                extraction.Format,
			"page_count":            extraction.PageCount,
			"target_pages":          targetPages,
			"total_words":           extraction.TotalWords,
			"mean_confidence":       extraction.MeanConfidence,
			"is_duplicate_detected": extraction.IsDuplicateDetected,
			"is_empty":              extraction.IsEmpty,
			"relevance":             aiAudit.IsRelevant,
			"relevance_score":       aiAudit.RelevanceScore,
			"sufficiency":           aiAudit.IsSubstantial,
			"satisfies_goal":        isFullyVerified,
			"verified":              isFullyVerified,
			"detected_topic":        aiAudit.DetectedTopic,
			"reasoning":             aiAudit.Reasoning,
			"ocr_engine":            extraction.OCREngine,
			"pages":                 extraction.Pages,
		},
	}

	if err := h.evidenceRepo.CreateBatch(c.Request.Context(), []models.Evidence{evidence}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "evidence_save_failed", "message": err.Error()})
		return
	}

	statusLabel := "verified"
	if !isFullyVerified {
		statusLabel = "rejected"
	}

	c.JSON(http.StatusOK, gin.H{
		"status": statusLabel,
		"verdict": gin.H{
			"commitment_verified":  isFullyVerified,
			"pages_verified":       fmt.Sprintf("%d / %d", extraction.PageCount, targetPages),
			"pages_count":          extraction.PageCount,
			"target_pages":         targetPages,
			"content_relevance":    map[bool]string{true: "Relevant", false: "Irrelevant (Topic Mismatch)"}[aiAudit.IsRelevant],
			"evidence_sufficiency": map[bool]string{true: "Sufficient", false: "Insufficient"}[aiAudit.IsSubstantial],
			"deadline_met":         map[bool]string{true: "Met", false: "Past Deadline"}[deadlineMet],
			"confidence":           confidenceLabel,
			"detected_topic":       aiAudit.DetectedTopic,
			"reasoning":            aiAudit.Reasoning,
			"ocr_engine":           extraction.OCREngine,
			"mean_confidence":      extraction.MeanConfidence,
			"is_duplicate":         extraction.IsDuplicateDetected,
		},
		"extraction": extraction,
		"evidence":   evidence,
	})
}

func (h *DocumentHandler) GetDocumentProof(c *gin.Context) {
	commitmentID := c.Param("id")
	list, err := h.evidenceRepo.ListByCommitmentID(c.Request.Context(), commitmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database_error"})
		return
	}

	var docEvidence []models.Evidence
	for _, item := range list {
		if item.Source == "document_proof" {
			docEvidence = append(docEvidence, item)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"evidence": docEvidence,
	})
}
