package models

import (
	"time"

	"github.com/google/uuid"
)

type CartItem struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	CartID   uuid.UUID `gorm:"type:uuid;not null;index"`     // Foreign key to cart
	ItemType string    `gorm:"type:cart_item_type;not null"` // Assuming USER-DEFINED type for cart_item_type enum

	// Product references (nullable foreign keys)
	ProductID       *uuid.UUID `gorm:"type:uuid;index"`
	VariantID       *uuid.UUID `gorm:"type:uuid;index"`
	BrandID         *uuid.UUID `gorm:"type:uuid;index"`
	BrandProductID  *uuid.UUID `gorm:"type:uuid;index"`
	SellerProductID *uuid.UUID `gorm:"type:uuid;index"`
	SellerID        *uuid.UUID `gorm:"type:uuid;index"`

	// Quantity and pricing
	Quantity             int       `gorm:"type:integer;not null;default:1"`
	SnapshotComparePrice *float64  `gorm:"type:decimal(10,2)"`
	CurrentUnitPrice     float64   `gorm:"type:decimal(10,2);not null"`
	PriceChanged         bool      `gorm:"not null;default:false"`
	PriceLastCheckedAt   time.Time `gorm:"type:timestamptz;not null"`

	// Availability
	IsAvailable         bool    `gorm:"not null;default:true"`
	AvailabilityMessage *string `gorm:"type:varchar(255)"`

	// Snapshot data (preserved at time of adding to cart)
	SnapshotUnitPrice   float64 `gorm:"type:decimal(10,2);not null"`
	SnapshotProductName string  `gorm:"type:varchar(255);not null"`
	SnapshotVariantName *string `gorm:"type:varchar(255)"`
	SnapshotSKU         *string `gorm:"type:varchar(100)"`
	SnapshotImageURL    *string `gorm:"type:text"`
	SnapshotSellerName  *string `gorm:"type:varchar(255)"`
	SnapshotBrandName   *string `gorm:"type:varchar(255)"`

	// Timestamps
	AddedAt   time.Time `gorm:"type:timestamptz;not null;autoCreateTime"`
	UpdatedAt time.Time `gorm:"type:timestamptz;not null;autoUpdateTime"`
}
