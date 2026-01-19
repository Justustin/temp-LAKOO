package utils

import (
	"context"
	"errors"
	"fmt"

	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()
}

func ValidatePayload(payload any) error {
	if err := validate.Struct(payload); err != nil {
		return errors.New("validation error: " + err.Error())
	}
	return nil
}

func GetValueFromContext[T any](ctx context.Context, key any) (T, error) { //here T is a generic type parameter
	value := ctx.Value(key)
	if value == nil {
		var zero T
		return zero, fmt.Errorf("key not found in context: %v", key)
	}

	val, ok := value.(T)
	if !ok {
		var zero T
		return zero, fmt.Errorf("type assertion failed: expected %T, got %T", zero, value)
	}

	return val, nil
}
