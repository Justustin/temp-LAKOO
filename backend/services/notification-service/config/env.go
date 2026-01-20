package config

import (
	"github.com/Flow-Indo/LAKOO/backend/shared/env"
	"github.com/lpernett/godotenv"
)

type Config struct {
	NOTIFICATION_SERVICE_PORT string
	TWILIO_ACCOUNT_SID        string
	TWILIO_AUTH_TOKEN         string
	TWILIO_WHATSAPP_NUMBER    string
	VAPID_PUBLIC_KEY          string
	VAPID_PRIVATE_KEY         string
	VAPID_EMAIL               string
	KAFKA_BROKERS             []string
	KAFKA_GROUP_ID            string
	KAFKA_TOPICS              []string
}

var Envs = initConfig()

func initConfig() *Config {
	godotenv.Load("../.env")

	return &Config{
		NOTIFICATION_SERVICE_PORT: env.GetEnv("NOTIFICATION_SERVICE_PORT", "3007"),
		TWILIO_ACCOUNT_SID:        env.GetEnv("TWILIO_ACCOUNT_SID", "123"),
		TWILIO_AUTH_TOKEN:         env.GetEnv("TWILIO_AUTH_TOKEN", "123"),
		TWILIO_WHATSAPP_NUMBER:    env.GetEnv("TWILIO_WHATSAPP_NUMBER", "123"),
		VAPID_PUBLIC_KEY:          env.GetEnv("VAPID_PUBLIC_KEY", "123"),
		VAPID_PRIVATE_KEY:         env.GetEnv("VAPID_PRIVATE_KEY", "123"),
		VAPID_EMAIL:               env.GetEnv("VAPID_EMAIL", "123@gmail.com"),
		KAFKA_BROKERS:             env.GetEnvAsSlice("KAFKA_BROKERS", []string{"localhost:9092"}, ","),
		KAFKA_GROUP_ID:            env.GetEnv("KAFKA_GROUP_ID", "kafka_group"),
		KAFKA_TOPICS:              env.GetEnvAsSlice("KAFKA_TOPICS", []string{"kafka_topic"}, ","),
	}
}
