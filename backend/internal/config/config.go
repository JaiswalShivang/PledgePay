package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	Env                string
	AllowedOrigins     string
	DatabaseURL        string
	RedisURL           string
	JWTSecret          string
	RazorpayKeyID      string
	RazorpayKeySecret  string
	GitHubClientID     string
	GitHubClientSecret string
	GroqAPIKey         string
	GroqModel          string
	WorkerPoolSize     int
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		Port:               getEnv("PORT", "8080"),
		Env:                getEnv("ENV", "development"),
		AllowedOrigins:     getEnv("ALLOWED_ORIGINS", "http://localhost:3000"),
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/pledgepay?sslmode=disable"),
		RedisURL:           getEnv("REDIS_URL", "redis://localhost:6379/0"),
		JWTSecret:          getEnv("JWT_SECRET", "dev-secret-key-pledgepay-change-in-production"),
		RazorpayKeyID:      getEnv("RAZORPAY_KEY_ID", ""),
		RazorpayKeySecret:  getEnv("RAZORPAY_KEY_SECRET", ""),
		GitHubClientID:     getEnv("GITHUB_CLIENT_ID", ""),
		GitHubClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
		GroqAPIKey:         getEnv("GROQ_API_KEY", ""),
		GroqModel:          getEnv("GROQ_MODEL", "openai/gpt-oss-120b"),
		WorkerPoolSize:     getEnvInt("WORKER_POOL_SIZE", 10),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	valStr := os.Getenv(key)
	if valStr == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(valStr)
	if err != nil {
		return defaultVal
	}
	return val
}
