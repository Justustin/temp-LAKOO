package middleware

import (
	"context"
	"errors"
	"net/http"

	"github.com/Flow-Indo/LAKOO/backend/shared/go/utils"
)

type contextKey string

const (
	userIDKey contextKey = "userID"
)

func UserIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userId := r.Header.Get("x-user-id")

		if userId == "" {
			utils.WriteError(w, http.StatusUnauthorized, errors.New("userID not found in request"))
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userId)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserIdFromContext(ctx context.Context) (string, error) {
	userId, err := utils.GetValueFromContext[string](ctx, userIDKey)
	return userId, err
}
