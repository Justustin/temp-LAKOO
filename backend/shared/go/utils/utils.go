package utils

import (
	"encoding/json"
	"strconv"
	"strings"
)

func PayloadToMap(payload interface{}) (map[string]interface{}, error) {
	marshalled, err := json.Marshal(payload) //from struct to []byte{}
	if err != nil {
		return nil, err
	}

	result := make(map[string]interface{})
	if err := json.Unmarshal(marshalled, &result); err != nil { //from []byte to json
		return nil, err
	}

	return result, nil
}

func GetStringFromJSONB(data JSONB, path string) string {
	if data == nil {
		return ""
	}

	keys := strings.Split(path, ".")

	current := interface{}(data)
	for _, key := range keys {
		if currentMap, ok := current.(map[string]interface{}); ok { //assertion where value.(type) tries to assert that value is of a specific type
			if next, exists := currentMap[key]; exists {
				current = next
			} else {
				return ""
			}
		} else {
			return ""
		}
	}

	switch v := current.(type) {
	case string:
		return v
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case bool:
		return strconv.FormatBool(v)
	case nil:
		return ""
	default:
		return ""
	}

}

func GetIntFromJSONB(data JSONB, path string) int {
	if data == nil {
		return 0
	}

	keys := strings.Split(path, ".")

	current := interface{}(data)
	for _, key := range keys {
		if currentMap, ok := current.(map[string]interface{}); ok {
			if next, exists := currentMap[key]; exists {
				current = next
			} else {
				return 0
			}
		} else {
			return 0
		}
	}

	switch v := current.(type) {
	case string:
		if val, err := strconv.Atoi(v); err == nil {
			return val
		}
		return 0
	case float64:
		return int(v)
	case bool:
		if v {
			return 1
		}

		return 0
	case int:
		return v
	case nil:
		return 0
	default:
		return 0
	}
}
