package types

import "time"

type CartItem struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	UserID    string    `gorm:"type:string;not null" json:"user_id"`
	ProductID string    `gorm:"type:string;not null" json:"product_id"`
	Quantity  int       `gorm:"not null" json:"quantity"`
	Price     float64   `gorm:"not null" json:"price"`
	CreatedAt time.Time `gorm:"not null" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null" json:"updated_at"`
}

type CartResponseDTO struct {
	Items      []CartItem `json:"items"`
	TotalPrice float32    `json:"total_price"`
}
