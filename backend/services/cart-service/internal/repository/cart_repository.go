package repository

import (
	"gorm.io/gorm"
)

type CartRepository struct {
	db *gorm.DB
}

func NewCartRepository(db *gorm.DB) *CartRepository {
	return &CartRepository{
		db: db,
	}
}

// func (r *CartRepository) GetCartByUserId(userId string) ([]models.CartItem, error) {
// 	var cartItems []models.CartItem

// 	results := r.db.Model(&models.CartItem{}).
// 		Joins("Product").
// 		Joins

// }
