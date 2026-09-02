package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jaiswalshivang/pledgepay/internal/payout"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"gorm.io/gorm"
)

type ResolutionHandler struct {
	resolver       *payout.Resolver
	commitmentRepo repository.CommitmentRepository
}

func NewResolutionHandler(resolver *payout.Resolver, commitmentRepo repository.CommitmentRepository) *ResolutionHandler {
	return &ResolutionHandler{
		resolver:       resolver,
		commitmentRepo: commitmentRepo,
	}
}

func (h *ResolutionHandler) GetCommitmentStatus(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(string)

	id := c.Param("id")
	commitment, err := h.commitmentRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "commitment_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database_error"})
		return
	}

	if commitment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	res, err := h.resolver.GetStatus(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *ResolutionHandler) CheckResolution(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(string)

	id := c.Param("id")
	commitment, err := h.commitmentRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "commitment_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database_error"})
		return
	}

	if commitment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	res, err := h.resolver.ResolveCommitment(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, res)
}
