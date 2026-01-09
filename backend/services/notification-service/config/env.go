package config

import (
	"log"
	"os"
	"strings"

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
		NOTIFICATION_SERVICE_PORT: getEnv("NOTIFICATION_SERVICE_PORT", "3007"),
		TWILIO_ACCOUNT_SID:        getEnv("TWILIO_ACCOUNT_SID", "123"),
		TWILIO_AUTH_TOKEN:         getEnv("TWILIO_AUTH_TOKEN", "123"),
		TWILIO_WHATSAPP_NUMBER:    getEnv("TWILIO_WHATSAPP_NUMBER", "123"),
		VAPID_PUBLIC_KEY:          getEnv("VAPID_PUBLIC_KEY", "123"),
		VAPID_PRIVATE_KEY:         getEnv("VAPID_PRIVATE_KEY", "123"),
		VAPID_EMAIL:               getEnv("VAPID_EMAIL", "123@gmail.com"),
		KAFKA_BROKERS:             getEnvAsSlice("KAFKA_BROKERS", []string{"localhost:9092"}, ","),
		KAFKA_GROUP_ID:            getEnv("KAFKA_GROUP_ID", "kafka_group"),
		KAFKA_TOPICS:              getEnvAsSlice("KAFKA_TOPICS", []string{"kafka_topic"}, ","),
	}
}

func getEnv(key string, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		log.Println("Value: ", value)
		return value
	}

	log.Println("Returning feedback")
	return fallback
}

func getEnvAsSlice(key string, fallback []string, separator string) []string {
	if value, ok := os.LookupEnv(key); ok {
		values := strings.Split(value, separator)

		for i, v := range values {
			values[i] = strings.TrimSpace(v)
		}

		return values
	}

	return fallback
}
