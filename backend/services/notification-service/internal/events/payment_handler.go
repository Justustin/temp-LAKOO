package events

import (
	"context"
	"log"

	"github.com/Flow-Indo/LAKOO/backend/services/notification-service/internal/client"
	"github.com/Flow-Indo/LAKOO/backend/services/notification-service/types"
)

type PaymentHandler struct {
	notifier client.WhatsAppService
}

func NewPaymentHandler(notifier client.WhatsAppService) *PaymentHandler {
	return &PaymentHandler{
		notifier: notifier,
	}
}

func (h *PaymentHandler) Handle(ctx context.Context, key []byte, message []byte) error {
	log.Printf("key: %s, value: %s", string(key), string(message))
	whatsAppPayload := types.WhatsAppMessage{
		UserId: string(key), PhoneNumber: "08119883223", Message: string(message),
	}
	h.notifier.Send(whatsAppPayload)
	log.Print("sent to whatsapp")
	return nil
}
