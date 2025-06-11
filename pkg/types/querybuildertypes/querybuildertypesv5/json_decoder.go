package querybuildertypesv5

import (
	"bytes"
	"encoding/json"
	"reflect"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

// UnmarshalJSONWithSuggestions unmarshals JSON data into the target struct
// and provides field name suggestions for unknown fields
func UnmarshalJSONWithSuggestions(data []byte, target any) error {
	return UnmarshalJSONWithContext(data, target, "")
}

// UnmarshalJSONWithContext unmarshals JSON with context information for better error messages
func UnmarshalJSONWithContext(data []byte, target any, context string) error {
	// First, try to unmarshal with DisallowUnknownFields to catch unknown fields
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()

	err := dec.Decode(target)
	if err == nil {
		// No error, successful unmarshal
		return nil
	}

	// Check if it's an unknown field error
	if strings.Contains(err.Error(), "unknown field") {
		// Extract the unknown field name
		unknownField := extractUnknownField(err.Error())
		if unknownField != "" {
			// Get valid field names from the target struct
			validFields := getJSONFieldNames(target)

			// Build error message with context
			errorMsg := "unknown field %q"
			if context != "" {
				errorMsg = "unknown field %q in " + context
			}

			// Find closest match with max distance of 3 (reasonable for typos)
			if suggestion, found := findClosestMatch(unknownField, validFields, 3); found {
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					errorMsg,
					unknownField,
				).WithAdditional(
					"Did you mean '" + suggestion + "'?",
				)
			}

			// No good suggestion found
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				errorMsg,
				unknownField,
			).WithAdditional(
				"Valid fields are: " + strings.Join(validFields, ", "),
			)
		}
	}

	// Return the original error if it's not an unknown field error
	return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid JSON: %v", err)
}

// extractUnknownField extracts the field name from an unknown field error message
func extractUnknownField(errMsg string) string {
	// The error message format is: json: unknown field "fieldname"
	parts := strings.Split(errMsg, `"`)
	if len(parts) >= 2 {
		return parts[1]
	}
	return ""
}

// getJSONFieldNames extracts all JSON field names from a struct
func getJSONFieldNames(v any) []string {
	var fields []string

	t := reflect.TypeOf(v)
	if t.Kind() == reflect.Ptr {
		t = t.Elem()
	}

	if t.Kind() != reflect.Struct {
		return fields
	}

	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		jsonTag := field.Tag.Get("json")

		if jsonTag == "" || jsonTag == "-" {
			continue
		}

		// Extract the field name from the JSON tag
		fieldName := strings.Split(jsonTag, ",")[0]
		if fieldName != "" {
			fields = append(fields, fieldName)
		}
	}

	return fields
}
