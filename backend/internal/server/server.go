package server

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jaiswalshivang/pledgepay/internal/ai"
	"github.com/jaiswalshivang/pledgepay/internal/config"
	"github.com/jaiswalshivang/pledgepay/internal/github"
	"github.com/jaiswalshivang/pledgepay/internal/handlers"
	"github.com/jaiswalshivang/pledgepay/internal/middleware"
	"github.com/jaiswalshivang/pledgepay/internal/payment"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type Server struct {
	Router *gin.Engine
	Config *config.Config
	DB     *gorm.DB
	Redis  *redis.Client
}

func New(cfg *config.Config, db *gorm.DB, rdb *redis.Client) *Server {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	router.Use(gin.Recovery())
	router.Use(structuredLoggerMiddleware())
	router.Use(corsMiddleware(cfg.AllowedOrigins))

	s := &Server{
		Router: router,
		Config: cfg,
		DB:     db,
		Redis:  rdb,
	}

	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	s.Router.GET("/healthz", s.handleHealthz)

	var userRepo repository.UserRepository
	var charityRepo repository.CharityRepository
	var commitmentRepo repository.CommitmentRepository
	var paymentRepo repository.PaymentRepository
	var integrationRepo repository.IntegrationRepository
	var evidenceRepo repository.EvidenceRepository
	var webhookRepo repository.WebhookRepository

	if s.DB != nil {
		userRepo = repository.NewUserRepository(s.DB)
		charityRepo = repository.NewCharityRepository(s.DB)
		commitmentRepo = repository.NewCommitmentRepository(s.DB)
		paymentRepo = repository.NewPaymentRepository(s.DB)
		integrationRepo = repository.NewIntegrationRepository(s.DB)
		evidenceRepo = repository.NewEvidenceRepository(s.DB)
		webhookRepo = repository.NewWebhookRepository(s.DB)
	}

	groqClient := ai.NewGroqClient(s.Config.GroqAPIKey, s.Config.GroqModel)
	razorpayClient := payment.NewRazorpayClient(s.Config.RazorpayKeyID, s.Config.RazorpayKeySecret)
	githubClient := github.NewGitHubClient(s.Config.GitHubClientID, s.Config.GitHubClientSecret)

	v1 := s.Router.Group("/api/v1")
	{
		if userRepo != nil {
			authHandler := handlers.NewAuthHandler(s.Config, userRepo)
			authGroup := v1.Group("/auth")
			{
				authGroup.POST("/register", authHandler.Register)
				authGroup.POST("/login", authHandler.Login)
				authGroup.POST("/logout", authHandler.Logout)
			}

			v1.GET("/me", middleware.AuthRequired(s.Config.JWTSecret), authHandler.GetMe)
		}

		if charityRepo != nil {
			aiHandler := handlers.NewAIHandler(groqClient, charityRepo)
			aiGroup := v1.Group("/ai")
			{
				aiGroup.POST("/structure-goal", aiHandler.StructureGoal)
				aiGroup.POST("/analyze-quality", aiHandler.AnalyzeQuality)
				aiGroup.POST("/suggest-charities", aiHandler.SuggestCharities)
				aiGroup.POST("/analyze-combined", aiHandler.AnalyzeCombined)
			}

			v1.GET("/charities", func(c *gin.Context) {
				list, err := charityRepo.ListActive(c.Request.Context())
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed_to_fetch_charities"})
					return
				}
				c.JSON(http.StatusOK, gin.H{"charities": list})
			})
		}

		if integrationRepo != nil && userRepo != nil && commitmentRepo != nil && evidenceRepo != nil {
			integrationHandler := handlers.NewIntegrationHandler(s.Config, githubClient, integrationRepo, userRepo, commitmentRepo, evidenceRepo)

			v1.GET("/integrations/github/callback", integrationHandler.GitHubCallback)

			intGroup := v1.Group("/integrations")
			intGroup.Use(middleware.AuthRequired(s.Config.JWTSecret))
			{
				intGroup.GET("/github/connect", integrationHandler.ConnectGitHub)
				intGroup.GET("/github/repos", integrationHandler.ListUserRepos)
			}
		}

		if commitmentRepo != nil && charityRepo != nil {
			commitmentHandler := handlers.NewCommitmentHandler(commitmentRepo, charityRepo)
			commGroup := v1.Group("/commitments")
			commGroup.Use(middleware.AuthRequired(s.Config.JWTSecret))
			{
				commGroup.POST("", commitmentHandler.CreateCommitment)
				commGroup.GET("", commitmentHandler.ListMyCommitments)
				commGroup.GET("/:id", commitmentHandler.GetCommitmentByID)

				if integrationRepo != nil && userRepo != nil && evidenceRepo != nil {
					integrationHandler := handlers.NewIntegrationHandler(s.Config, githubClient, integrationRepo, userRepo, commitmentRepo, evidenceRepo)
					commGroup.POST("/:id/link-repo", integrationHandler.LinkRepo)
					commGroup.POST("/:id/sync-evidence", integrationHandler.SyncEvidence)
					commGroup.GET("/:id/evidence", integrationHandler.GetCommitmentEvidence)
				}
			}
		}

		if paymentRepo != nil && commitmentRepo != nil && charityRepo != nil && webhookRepo != nil {
			paymentHandler := handlers.NewPaymentHandler(s.Config, razorpayClient, paymentRepo, commitmentRepo, charityRepo, webhookRepo)
			payGroup := v1.Group("/payments")
			payGroup.Use(middleware.AuthRequired(s.Config.JWTSecret))
			{
				payGroup.POST("/create-order", paymentHandler.CreateOrder)
				payGroup.POST("/verify", paymentHandler.VerifyPayment)
			}

			webhookGroup := v1.Group("/webhooks")
			{
				webhookGroup.POST("/razorpay", paymentHandler.HandleRazorpayWebhook)
			}
		}
	}
}

func (s *Server) handleHealthz(c *gin.Context) {
	dbStatus := "disconnected"
	if s.DB != nil {
		sqlDB, err := s.DB.DB()
		if err == nil {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
			defer cancel()
			if err := sqlDB.PingContext(ctx); err == nil {
				dbStatus = "connected"
			}
		}
	}

	redisStatus := "disconnected"
	if s.Redis != nil {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := s.Redis.Ping(ctx).Err(); err == nil {
			redisStatus = "connected"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"service":   "pledgepay-api",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"db":        dbStatus,
		"redis":     redisStatus,
		"env":       s.Config.Env,
	})
}

func structuredLoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()
		clientIP := c.ClientIP()
		method := c.Request.Method

		slog.Info("HTTP request",
			"status", statusCode,
			"method", method,
			"path", path,
			"query", query,
			"ip", clientIP,
			"latency_ms", latency.Milliseconds(),
		)
	}
}

func corsMiddleware(allowedOriginsStr string) gin.HandlerFunc {
	origins := []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	if allowedOriginsStr != "" && allowedOriginsStr != "*" {
		parts := strings.Split(allowedOriginsStr, ",")
		for _, p := range parts {
			trimmed := strings.TrimSpace(p)
			if trimmed != "" {
				origins = append(origins, trimmed)
			}
		}
	}

	return cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With", "Cookie"},
		ExposeHeaders:    []string{"Content-Length", "Set-Cookie"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	})
}
