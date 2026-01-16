package types

type GetCartRequest struct {
	UserId string `schema:"userId"`
}

type CartItemRequest struct {
	ProductID string `json:"product_id" validate:"required,uuid4"`
	Quantity  int    `json:"quantity" validate:"required,min=1"`
}
