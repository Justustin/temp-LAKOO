package middleware

import (
	"errors"
	"net/http"
	"os"

	"github.com/Flow-Indo/LAKOO/backend/shared/go/utils"
)

const (
	ServiceAuthHeader = "x-service-auth"
	ServiceNameHeader = "x-service-name"
)

func ServiceAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get(ServiceAuthHeader)
		serviceName := r.Header.Get(ServiceNameHeader)

		if token == "" || serviceName == "" {
			utils.WriteError(w, http.StatusUnauthorized, errors.New("Service authentication required"))
			return
		}

		serviceSecret := os.Getenv("SERVICE_SECRET")
		if serviceSecret == "" {
			utils.WriteError(w, http.StatusInternalServerError, errors.New("Service secret not configured"))
			return
		}

		if err := utils.VerifyServiceToken(token, serviceSecret); err != nil {
			utils.WriteError(w, http.StatusUnauthorized, err)
			return
		}

		next.ServeHTTP(w, r)

	})
}
