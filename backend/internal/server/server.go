package server

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jaiswalshivang/pledgepay/internal/config"
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
	origins := []string{"*"}
	if allowedOriginsStr != "" && allowedOriginsStr != "*" {
		origins = strings.Split(allowedOriginsStr, ",")
		for i := range origins {
			origins[i] = strings.TrimSpace(origins[i])
		}
	}

	return cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	})
}
