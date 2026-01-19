package env

import (
	"log"
	"os"
	"strings"
)

func GetEnv(key string, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		log.Println("Value: ", value)
		return value
	}

	log.Println("Returning feedback")
	return fallback
}

func GetEnvAsSlice(key string, fallback []string, separator string) []string {
	if value, ok := os.LookupEnv(key); ok {
		values := strings.Split(value, separator)

		for i, v := range values {
			values[i] = strings.TrimSpace(v)
		}

		return values
	}

	return fallback
}
