package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"
)

const (
	ServiceAuthHeader = "X-Service-Auth"
	ServiceNameHeader = "X-Service-Name"
)

// create HMAC-signed token for service-service auth
func GenerateServiceToken(serviceName, secret string) string {
	timestamp := time.Now().Unix() //seconds that have passed since January 1, 1970 = to represent dates and times in a machine-readable format.
	// Adds time sensitivity - tokens expire naturally.

	message := fmt.Sprintf("%s:%d", serviceName, timestamp)

	//HMAC = Hash-based Message Authentication Code, It's like a digital signature that proves "this message came from someone who knows the secret."
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))                    //HMAC internally combines the secret and message to create a unique signature.
	signature := hex.EncodeToString(h.Sum(nil)) //Creates a verifiable signature that can't be forged without knowing the secret.

	return fmt.Sprintf("%s:%d:%s", serviceName, timestamp, signature)
}

func VerifyServiceToken(token, secret string) (string, error) {
	var serviceName string
	var timestamp int64
	var signature string

	//parse token: should be serviceName:timestamp:signature
	n, err := fmt.Sscanf(token, "%[^:]:%d:%s", &serviceName, &timestamp, &signature)
	if err != nil || n != 3 {
		return "", errors.New("invalid token format")
	}
	//check if token is not too old (5 minutes)
	if time.Now().Unix()-timestamp > 300 {
		return "", errors.New("token expired")
	}

	//Verify Signature
	message := fmt.Sprintf("%s:%d", serviceName, timestamp)
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
		return "", errors.New("invalid signature")
	}

	return serviceName, nil

}
