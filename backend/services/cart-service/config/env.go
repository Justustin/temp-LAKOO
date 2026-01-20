package config

import (
	"github.com/Flow-Indo/LAKOO/backend/shared/env"
	"github.com/lpernett/godotenv"
)

type Config struct {
	CART_SERVICE_PORT string
	DB_USER           string
	DB_PASSWORD       string
	DB_NAME           string
	DB_HOST           string
	DB_PORT           string
	DB_SSL            string
}

func initConfig() *Config {
	godotenv.Load("../.env")
	return &Config{
		CART_SERVICE_PORT: env.GetEnv("CART_SERVICE_PORT", "3003"),
		DB_USER:           env.GetEnv("DB_USER", "user"),
		DB_PASSWORD:       env.GetEnv("DB_PASSWORD", "password"),
		DB_NAME:           env.GetEnv("DB_NAME", "dbname"),
		DB_HOST:           env.GetEnv("DB_HOST", "localhost"),
		DB_PORT:           env.GetEnv("DB_PORT", "5432"),
		DB_SSL:            env.GetEnv("DB_SSL", "disable"),
	}
}

var Envs = initConfig()
