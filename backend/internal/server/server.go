package server

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jaiswalshivang/pledgepay/internal/ai"
	"github.com/jaiswalshivang/pledgepay/internal/config"
	"github.com/jaiswalshivang/pledgepay/internal/evidencesync"
	"github.com/jaiswalshivang/pledgepay/internal/github"
	"github.com/jaiswalshivang/pledgepay/internal/handlers"
	"github.com/jaiswalshivang/pledgepay/internal/middleware"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/payment"
	"github.com/jaiswalshivang/pledgepay/internal/payout"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Server struct {
	Router         *gin.Engine
	Config         *config.Config
	DB             *gorm.DB
	Redis          *redis.Client
	Resolver       *payout.Resolver
	EvidenceSyncer *evidencesync.Syncer
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
	var donationRepo repository.DonationRepository
	var integrationRepo repository.IntegrationRepository
	var evidenceRepo repository.EvidenceRepository
	var verificationRepo repository.VerificationRepository
	var webhookRepo repository.WebhookRepository

	if s.DB != nil {
		userRepo = repository.NewUserRepository(s.DB)
		charityRepo = repository.NewCharityRepository(s.DB)
		commitmentRepo = repository.NewCommitmentRepository(s.DB)
		paymentRepo = repository.NewPaymentRepository(s.DB)
		donationRepo = repository.NewDonationRepository(s.DB)
		integrationRepo = repository.NewIntegrationRepository(s.DB)
		evidenceRepo = repository.NewEvidenceRepository(s.DB)
		verificationRepo = repository.NewVerificationRepository(s.DB)
		webhookRepo = repository.NewWebhookRepository(s.DB)
	}

	groqClient := ai.NewGroqClient(s.Config.GroqAPIKey, s.Config.GroqModel)
	razorpayClient := payment.NewRazorpayClient(s.Config.RazorpayKeyID, s.Config.RazorpayKeySecret)
	razorpayXClient := payout.NewRazorpayXClient(s.Config.RazorpayKeyID, s.Config.RazorpayKeySecret, true)
	githubClient := github.NewGitHubClient(s.Config.GitHubClientID, s.Config.GitHubClientSecret)

	var resolver *payout.Resolver
	if s.DB != nil && donationRepo != nil && evidenceRepo != nil && verificationRepo != nil && commitmentRepo != nil && charityRepo != nil {
		resolver = payout.NewResolver(s.DB, razorpayXClient, commitmentRepo, charityRepo, donationRepo, evidenceRepo, verificationRepo)
		s.Resolver = resolver
	}

	if integrationRepo != nil && userRepo != nil && evidenceRepo != nil {
		s.EvidenceSyncer = evidencesync.New(githubClient, integrationRepo, userRepo, evidenceRepo)
	}

	_ = os.MkdirAll("uploads", 0755)
	s.Router.Static("/uploads", "./uploads")

	v1 := s.Router.Group("/api/v1")
	{
		if userRepo != nil {
			authHandler := handlers.NewAuthHandler(s.Config, userRepo, integrationRepo)
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

			// GitHub OAuth callback routes - handles both /api/auth/github/callback and /api/v1/integrations/github/callback
			s.Router.GET("/api/auth/github/callback", integrationHandler.GitHubCallback)
			s.Router.GET("/api/v1/auth/github/callback", integrationHandler.GitHubCallback)
			s.Router.GET("/auth/github/callback", integrationHandler.GitHubCallback)
			v1.GET("/integrations/github/callback", integrationHandler.GitHubCallback)

			intGroup := v1.Group("/integrations")
			intGroup.Use(middleware.AuthRequired(s.Config.JWTSecret))
			{
				intGroup.GET("/github/connect", integrationHandler.ConnectGitHub)
				intGroup.GET("/github/repos", integrationHandler.ListUserRepos)
				intGroup.POST("/codeforces/connect", integrationHandler.ConnectCodeforces)
			}

		}

		if commitmentRepo != nil && evidenceRepo != nil && donationRepo != nil && verificationRepo != nil {
			dashboardHandler := handlers.NewDashboardHandler(commitmentRepo, evidenceRepo, donationRepo, verificationRepo)
			v1.GET("/dashboard", middleware.AuthRequired(s.Config.JWTSecret), dashboardHandler.GetDashboard)
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

				if evidenceRepo != nil && verificationRepo != nil {
					progressHandler := handlers.NewProgressHandler(commitmentRepo, evidenceRepo, verificationRepo)
					verificationHandler := handlers.NewVerificationHandler(groqClient, commitmentRepo, evidenceRepo, verificationRepo)
					coachHandler := handlers.NewCoachHandler(groqClient, commitmentRepo, evidenceRepo)
					commGroup.GET("/:id/progress", progressHandler.GetProgress)
					commGroup.POST("/:id/verify", verificationHandler.VerifyCommitment)
					commGroup.GET("/:id/verification", verificationHandler.GetLatestVerification)
					commGroup.POST("/:id/coach", coachHandler.AskCoach)
				}

				if evidenceRepo != nil {
					documentHandler := handlers.NewDocumentHandler(commitmentRepo, evidenceRepo, groqClient)
					commGroup.POST("/:id/upload-document", documentHandler.UploadDocumentProof)
					commGroup.GET("/:id/document-proof", documentHandler.GetDocumentProof)
				}

				if resolver != nil {
					resolutionHandler := handlers.NewResolutionHandler(resolver, commitmentRepo)
					commGroup.GET("/:id/status", resolutionHandler.GetCommitmentStatus)
					commGroup.POST("/:id/check-resolution", resolutionHandler.CheckResolution)
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

		if s.DB != nil && resolver != nil {
			devHandler := handlers.NewDevHandler(s.DB, resolver, true)
			devGroup := v1.Group("/dev")
			{
				devGroup.POST("/reset-demo", devHandler.ResetDemo)
				devGroup.POST("/inject-anomaly", devHandler.InjectAnomaly)
				devGroup.POST("/force-success", devHandler.ForceSuccess)
				devGroup.POST("/force-failure", devHandler.ForceFailure)
			}
		}

		if s.DB != nil {
			s.seedAdminUser()
			adminHandler := handlers.NewAdminHandler(s.DB, resolver, razorpayXClient)
			adminGroup := v1.Group("/admin")
			adminGroup.Use(middleware.AuthRequired(s.Config.JWTSecret))
			{
				adminGroup.GET("/stats", adminHandler.GetAdminStats)
				adminGroup.GET("/transactions", adminHandler.GetAdminTransactions)
				adminGroup.POST("/payout", adminHandler.ReleasePayout)
				adminGroup.GET("/charities", adminHandler.ListCharities)
				adminGroup.POST("/charities", adminHandler.CreateCharity)
				adminGroup.DELETE("/charities/:id", adminHandler.DeleteCharity)
			}
		}
	}
}

func (s *Server) seedAdminUser() {
	if s.DB == nil {
		return
	}
	var admin models.User
	err := s.DB.Where("email = ?", "admin@admin.com").First(&admin).Error
	hashedPass, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)

	if err != nil {
		admin = models.User{
			Email:        "admin@admin.com",
			Name:         "System Admin",
			PasswordHash: string(hashedPass),
			Role:         "admin",
		}
		if cErr := s.DB.Create(&admin).Error; cErr == nil {
			slog.Info("Admin user initialized", "email", "admin@admin.com")
		}
	} else {
		s.DB.Model(&admin).Updates(map[string]interface{}{
			"password_hash": string(hashedPass),
			"role":          "admin",
		})
		slog.Info("Admin user credentials synced", "email", "admin@admin.com")
	}
}

func (s *Server) StartSettlementWorker(ctx context.Context) {
	if s.DB == nil || s.Resolver == nil {
		return
	}

	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		slog.Info("Automated Escrow Settlement Worker active (checks every 5s)")

		for {
			select {
			case <-ctx.Done():
				slog.Info("Settlement worker stopped")
				return
			case <-ticker.C:
				s.settleExpiredCommitments(ctx)
			}
		}
	}()
}

func (s *Server) settleExpiredCommitments(ctx context.Context) {
	now := time.Now().UTC()
	var expiredIDs []string
	err := s.DB.WithContext(ctx).
		Model(&models.Commitment{}).
		Where("status = ? AND end_date <= ?", "ACTIVE", now).
		Pluck("id", &expiredIDs).Error

	if err != nil || len(expiredIDs) == 0 {
		return
	}

	for _, id := range expiredIDs {
		// Load the full commitment so we can sync evidence for it
		var commitment models.Commitment
		if err := s.DB.WithContext(ctx).Preload("User").First(&commitment, "id = ?", id).Error; err != nil {
			slog.Error("Settlement worker: failed to load commitment", "commitment_id", id, "error", err)
			continue
		}

		// Step 1: Auto-sync fresh evidence from CF or GitHub before evaluating
		if s.EvidenceSyncer != nil {
			slog.Info("Settlement worker: syncing evidence before resolution", "commitment_id", id, "evidence_type", commitment.EvidenceType)
			if syncErr := s.EvidenceSyncer.SyncForCommitment(ctx, &commitment); syncErr != nil {
				slog.Warn("Settlement worker: evidence sync failed (proceeding anyway)", "commitment_id", id, "error", syncErr)
			}
		}

		// Step 2: Resolve — evaluate progress and dispatch payout or refund
		slog.Info("Settlement worker: resolving commitment", "commitment_id", id)
		res, rErr := s.Resolver.ResolveCommitment(ctx, id)
		if rErr != nil {
			slog.Error("Settlement worker: resolve failed", "commitment_id", id, "error", rErr)
			continue
		}
		slog.Info("Settlement worker: commitment resolved",
			"commitment_id", id,
			"state", res.State,
			"verified", res.Progress.Verified,
			"target", res.Progress.Target,
			"progress_pct", res.Progress.ProgressPct,
		)
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
