package controller

import (
	"net/http"

	"github.com/Flow-Indo/LAKOO/backend/services/cart-service/internal/service"
	"github.com/Flow-Indo/LAKOO/backend/services/cart-service/types"
	"github.com/Flow-Indo/LAKOO/backend/shared/utils"
	"github.com/gorilla/mux"
)

type CartHandler struct {
	service *service.CartService
}

func NewCartHandler(service *service.CartService) *CartHandler {
	return &CartHandler{
		service: service,
	}
}

func (h *CartHandler) RegisterRoutes(cartRouter *mux.Router) {
	cartRouter.HandleFunc("/", h.GetCart).Methods("GET")

}

func (h *CartHandler) GetCart(w http.ResponseWriter, r *http.Request) {
	var cartFilterPayload types.CartFilterPayload

	if err := utils.DecodeQueryParamsWithValidation(&cartFilterPayload, r); err != nil {
		utils.WriteError(w, http.StatusBadRequest, err)
		return
	}

	if cart, err := h.service.GetCart(cartFilterPayload.UserId); err != nil {
		utils.WriteError(w, http.StatusInternalServerError, err)
	}

	utils.WriteJSONResponse(w, http.StatusOK, cart)
}

// func (h *CartHandler) AddToCart(w http.ResponseWriter, r *http.Request) {
// 	var addToCartPayload types.AddToCartPayload

// }
