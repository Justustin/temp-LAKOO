package client

import (
	"errors"
	"fmt"
	"log"
	"regexp"
	"strings"

	"github.com/twilio/twilio-go"
	twilioApi "github.com/twilio/twilio-go/rest/api/v2010"

	"github.com/Flow-Indo/LAKOO/backend/services/notification-service/config"
	"github.com/Flow-Indo/LAKOO/backend/services/notification-service/types"
)

type WhatsAppService struct {
	twilioClient *twilio.RestClient
}

var nonNumericRegex = regexp.MustCompile(`[^0-9]`)

func NewWhatsAppService() *WhatsAppService {
	client := twilio.NewRestClientWithParams(twilio.ClientParams{
		Username: config.Envs.TWILIO_ACCOUNT_SID,
		Password: config.Envs.TWILIO_AUTH_TOKEN,
	})

	return &WhatsAppService{
		twilioClient: client,
	}
}

func (ws *WhatsAppService) Send(payload types.WhatsAppMessage) error {
	if payload.PhoneNumber == "" {
		return errors.New("phone number is needed to use twilio")
	}

	formattedPhoneNumber := formatPhoneNumber(payload.PhoneNumber)
	log.Printf("formatted phonenumber: %s", formattedPhoneNumber)

	params := &twilioApi.CreateMessageParams{}
	params.SetFrom(config.Envs.TWILIO_WHATSAPP_NUMBER)
	params.SetTo(fmt.Sprintf("whatsapp:%s", formattedPhoneNumber))
	params.SetBody(payload.Message)

	log.Printf("done")

	result, err := ws.twilioClient.Api.CreateMessage(params)
	if err != nil {
		log.Printf("error sending message: %v", err)
		return errors.New("failed to send whatsapp message")
	}

	log.Printf("WhatsApp sent to %s", formattedPhoneNumber)
	log.Printf("Twilio message SID: %s", *result.Sid)
	log.Printf("Twilio status: %s", *result.Status)
	return nil
}

func formatPhoneNumber(phoneNumber string) string {
	cleaned := nonNumericRegex.ReplaceAllString(phoneNumber, "")

	if strings.HasPrefix(cleaned, "0") {
		cleaned = "62" + cleaned[1:]
	}

	if !strings.HasPrefix(cleaned, "62") {
		cleaned = "62" + cleaned
	}

	return "+" + cleaned
}
