package querybuildertypesv5

import (
	"bytes"
	"encoding/json"
	"reflect"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

// UnmarshalJSONWithSuggestions unmarshals JSON data into the target struct
// and provides field name suggestions for unknown fields.
func UnmarshalJSONWithSuggestions(data []byte, target any) error {
	return UnmarshalJSONWithContext(data, target, "")
}

// enumReferencesSuggestion renders an Enum() value list as a backtick-delimited
// "valid references" suggestion string.
func enumReferencesSuggestion(values []any) string {
	refs := make([]string, 0, len(values))
	for _, v := range values {
		if sv, ok := v.(interface{ StringValue() string }); ok {
			refs = append(refs, sv.StringValue())
		}
	}
	return errors.ValidReferences(refs...)
}

// UnmarshalJSONWithContext unmarshals JSON with context information for better error messages.
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

			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				errorMsg,
				unknownField,
			).WithSuggestions(errors.Suggestions(unknownField, validFields)...)
		}
	}

	// Return the original error if it's not an unknown field error
	return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid JSON: %v", err)
}

// extractUnknownField extracts the field name from an unknown field error message.
func extractUnknownField(errMsg string) string {
	// The error message format is: json: unknown field "fieldname"
	parts := strings.Split(errMsg, `"`)
	if len(parts) >= 2 {
		return parts[1]
	}
	return ""
}

// getJSONFieldNames extracts all JSON field names from a struct.
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

// wrapUnmarshalError wraps UnmarshalJSONWithContext errors with appropriate context
// It preserves errors that already carry structured context or unknown field errors.
func wrapUnmarshalError(err error, errorFormat string, args ...interface{}) error {
	if err == nil {
		return nil
	}

	// If it already carries structured context (additional hints or
	// suggestions), return it as-is rather than flattening it into a fresh
	// message and dropping those fields.
	_, _, _, _, _, additionals := errors.Unwrapb(err)
	j := errors.AsJSON(err)
	if len(additionals) > 0 || len(j.Suggestions) > 0 {
		return err
	}

	// Preserve helpful error messages about unknown fields
	if strings.Contains(err.Error(), "unknown field") {
		return err
	}

	// Wrap with the provided error format
	return errors.NewInvalidInputf(
		errors.CodeInvalidInput,
		errorFormat,
		args...,
	)
}

// wrapValidationError rewraps validation errors with context while preserving additional hints
// It extracts the inner message from the error and creates a new error with the provided format
// The innerMsg is automatically appended to the args for formatting.
func wrapValidationError(err error, contextIdentifier string, errorFormat string) error {
	if err == nil {
		return nil
	}

	// Extract the underlying error details
	_, _, innerMsg, _, _, additionals := errors.Unwrapb(err)
	inner := errors.AsJSON(err)

	// Create a new error with the provided format
	newErr := errors.NewInvalidInputf(
		errors.CodeInvalidInput,
		errorFormat,
		contextIdentifier,
		innerMsg,
	)

	// Carry over the structured context from the inner error: the additional
	// details (which themselves may carry suggestions) and the error-wide suggestions.
	if len(additionals) > 0 {
		newErr = newErr.WithAdditionals(additionals...)
	}
	if len(inner.Suggestions) > 0 {
		newErr = newErr.WithSuggestions(inner.Suggestions...)
	}

	return newErr
}
