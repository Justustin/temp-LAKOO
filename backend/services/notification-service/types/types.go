package types

type WhatsAppMessage struct {
	UserId      string `json:"userId"`
	PhoneNumber string `json:"phoneNumber"`
	Message     string `json:"message"`
}

type BulkWhatsAppPayload struct {
	messages []WhatsAppMessage `json:"messages"`
}
