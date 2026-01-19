package utils

import (
	"errors"
	"net/http"
	"reflect"

	"github.com/gorilla/schema"
)

var decoder *schema.Decoder

func init() {
	decoder = schema.NewDecoder()
	decoder.IgnoreUnknownKeys(true)
	decoder.SetAliasTag("query")

}

func DecodeQueryParams(payload any, r *http.Request) error {
	if payload == nil {
		return errors.New("payload is nil")
	}

	value := reflect.ValueOf(payload)
	if value.Kind() != reflect.Ptr || value.Elem().Kind() != reflect.Struct {
		return errors.New("payload must be a non-nil pointer")
	}

	if err := decoder.Decode(payload, r.URL.Query()); err != nil {
		return errors.New("failed to decode query params: " + err.Error())
	}

	return nil
}

func DecodeQueryParamsWithValidation(payload any, r *http.Request) error {
	if err := DecodeQueryParams(payload, r); err != nil {
		return err
	}

	return ValidatePayload(payload)
}
