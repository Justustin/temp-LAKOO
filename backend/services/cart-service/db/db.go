package db

import (
	"fmt"

	"github.com/Flow-Indo/LAKOO/backend/services/cart-service/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func NewPostgresStore() (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%v user=%v password=%v dbname=%v port=%v sslmode=%v",
		config.Envs.DB_HOST,
		config.Envs.DB_USER,
		config.Envs.DB_PASSWORD,
		config.Envs.DB_NAME,
		config.Envs.DB_PORT,
		config.Envs.DB_SSL,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	return db, nil
}
