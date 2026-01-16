package client

import (
	"context"

	"github.com/Flow-Indo/LAKOO/backend/services/cart-service/domain/types"
)

type ProductServiceClient interface {
	GetProductByIdBase(ctx context.Context, productId string) (*types.ProductResponseDTO, error)
}
