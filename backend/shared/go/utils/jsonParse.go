package utils

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

func ParseJSONBody(body io.Reader, payload any) error {
	if body == nil {
		return errors.New("body is nil")
	}

	return json.NewDecoder(body).Decode(payload)
}

func WriteJSONResponse(w http.ResponseWriter, status int, v any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	return json.NewEncoder(w).Encode(v)
}

func WriteError(w http.ResponseWriter, status int, err error) {
	WriteJSONResponse(w, status, map[string]string{"error": err.Error()})
}

type JSONB map[string]interface{}

func (j *JSONB) Scan(value interface{}) error { //json to map[string]interface{}, gorm calls this method when retrieving from db
	if value == nil {
		*j = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, j)
	case string:
		return json.Unmarshal([]byte(v), j)
	default:
		return errors.New("unsupported type for JSONB")
	}
}

func (j JSONB) Value() (interface{}, error) { //map[string]interface{} to json, gorm calls this method when saving to db
	if j == nil {
		return nil, nil
	}

	return json.Marshal(j)
}
