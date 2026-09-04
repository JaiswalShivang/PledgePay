package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jaiswalshivang/pledgepay/internal/auth"
	"github.com/jaiswalshivang/pledgepay/internal/config"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	cfg             *config.Config
	userRepo        repository.UserRepository
	integrationRepo repository.IntegrationRepository
}

func NewAuthHandler(cfg *config.Config, userRepo repository.UserRepository, integrationRepo ...repository.IntegrationRepository) *AuthHandler {
	var intRepo repository.IntegrationRepository
	if len(integrationRepo) > 0 {
		intRepo = integrationRepo[0]
	}
	return &AuthHandler{
		cfg:             cfg,
		userRepo:        userRepo,
		integrationRepo: intRepo,
	}
}

type RegisterRequest struct {
	Email              string  `json:"email" binding:"required,email"`
	Password           string  `json:"password" binding:"required,min=8"`
	Name               string  `json:"name" binding:"required,min=2"`
	GithubUsername     *string `json:"github_username"`
	CodeforcesUsername *string `json:"codeforces_username"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UserResponse struct {
	ID                   string    `json:"id"`
	Email                string    `json:"email"`
	Name                 string    `json:"name"`
	GithubUsername       *string   `json:"github_username,omitempty"`
	CodeforcesUsername   *string   `json:"codeforces_username,omitempty"`
	Role                 string    `json:"role"`
	CreatedAt            time.Time `json:"created_at"`
}

func toUserResponse(user *models.User) UserResponse {
	role := user.Role
	if role == "" {
		role = "user"
	}
	return UserResponse{
		ID:                   user.ID,
		Email:                user.Email,
		Name:                 user.Name,
		GithubUsername:       user.GithubUsername,
		CodeforcesUsername:   user.CodeforcesUsername,
		Role:                 role,
		CreatedAt:            user.CreatedAt,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": err.Error(),
		})
		return
	}

	existingUser, err := h.userRepo.GetByEmail(c.Request.Context(), req.Email)
	if err == nil && existingUser != nil {
		c.JSON(http.StatusConflict, gin.H{
			"error":   "email_exists",
			"message": "a user with this email already exists",
		})
		return
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		slog.Error("Failed to check email availability", "error", err, "email", req.Email)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "database_error",
			"message": "failed to check email availability: " + err.Error(),
		})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		slog.Error("Failed to hash password", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "crypto_error",
			"message": "failed to hash password",
		})
		return
	}

	now := time.Now().UTC()
	user := &models.User{
		ID:                 uuid.New().String(),
		Email:              req.Email,
		PasswordHash:       string(hashedPassword),
		Name:               req.Name,
		GithubUsername:     req.GithubUsername,
		CodeforcesUsername: req.CodeforcesUsername,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := h.userRepo.Create(c.Request.Context(), user); err != nil {
		slog.Error("Failed to create user account in database", "error", err, "user_id", user.ID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "database_error",
			"message": "failed to create user account: " + err.Error(),
		})
		return
	}

	if h.integrationRepo != nil {
		if req.CodeforcesUsername != nil && *req.CodeforcesUsername != "" {
			_ = h.integrationRepo.Upsert(c.Request.Context(), &models.Integration{
				UserID:           user.ID,
				Provider:         "codeforces",
				ExternalUsername: req.CodeforcesUsername,
			})
		}
		if req.GithubUsername != nil && *req.GithubUsername != "" {
			_ = h.integrationRepo.Upsert(c.Request.Context(), &models.Integration{
				UserID:           user.ID,
				Provider:         "github",
				ExternalUsername: req.GithubUsername,
			})
		}
	}

	tokenDuration := 7 * 24 * time.Hour
	token, err := auth.GenerateToken(user.ID, user.Email, h.cfg.JWTSecret, tokenDuration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "token_generation_failed",
			"message": "account created but failed to issue token",
		})
		return
	}

	isProd := h.cfg.Env == "production"
	c.SetCookie("auth_token", token, int(tokenDuration.Seconds()), "/", "", isProd, true)

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user":  toUserResponse(user),
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": err.Error(),
		})
		return
	}

	user, err := h.userRepo.GetByEmail(c.Request.Context(), req.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "invalid_credentials",
				"message": "invalid email or password",
			})
			return
		}
		slog.Error("Failed to look up user account", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "database_error",
			"message": "failed to look up user account: " + err.Error(),
		})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "invalid_credentials",
			"message": "invalid email or password",
		})
		return
	}

	tokenDuration := 7 * 24 * time.Hour
	token, err := auth.GenerateToken(user.ID, user.Email, h.cfg.JWTSecret, tokenDuration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "token_generation_failed",
			"message": "failed to issue authentication token",
		})
		return
	}

	isProd := h.cfg.Env == "production"
	c.SetCookie("auth_token", token, int(tokenDuration.Seconds()), "/", "", isProd, true)

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  toUserResponse(user),
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	isProd := h.cfg.Env == "production"
	c.SetCookie("auth_token", "", -1, "/", "", isProd, true)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "successfully logged out",
	})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "user not found in context",
		})
		return
	}

	userID, ok := userIDVal.(string)
	if !ok || userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "invalid user context identifier",
		})
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "user_not_found",
				"message": "user account not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "database_error",
			"message": "failed to retrieve profile",
		})
		return
	}

	integrations := make([]gin.H, 0)
	for _, integ := range user.Integrations {
		integrations = append(integrations, gin.H{
			"id":                integ.ID,
			"provider":          integ.Provider,
			"external_username": integ.ExternalUsername,
			"connected_at":      integ.ConnectedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":                   user.ID,
			"email":                user.Email,
			"name":                 user.Name,
			"github_username":      user.GithubUsername,
			"codeforces_username":  user.CodeforcesUsername,
			"created_at":           user.CreatedAt,
			"integrations":         integrations,
		},
	})
}
