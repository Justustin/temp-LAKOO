package service

import (
	"github.com/Flow-Indo/LAKOO/backend/services/cart-service/internal/repository"
	"github.com/Flow-Indo/LAKOO/backend/services/cart-service/models"
	"github.com/Flow-Indo/LAKOO/backend/services/cart-service/types"
)

type CartService struct {
	repository *repository.CartRepository
}

func NewCartService(repository *repository.CartRepository) *CartService {
	return &CartService{
		repository: repository,
	}
}

func (s *CartService) GetCart(userId string) (types.CartResponseDTO, error) {

	if cartItems, err := s.repository.GetCartByUserId(userId); err != nil {
		return types.CartResponseDTO{}, err
	}

	return s.parseToCartResponse(cartItems), nil
}

func (s *CartService) parseToCartResponse(cartItems []models.CartItem) types.CartResponseDTO {
	var cartResponse types.CartResponseDTO

	cartResponse.Items = cartItems
	for _, item := range cartItems {
		cartResponse.TotalPrice += item.Price * float64(item.Quantity)
	}

	return cartResponse
}
