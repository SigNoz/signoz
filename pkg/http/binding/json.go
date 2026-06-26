package binding

import (
	"encoding/json"
	"io"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/jsonschema"
)

const (
	ErrMessageInvalidJSON  string = "request body contains invalid JSON, please verify the format and try again."
	ErrMessageInvalidField string = "request body contains invalid field value"
)

var _ BindingBody = (*jsonBinding)(nil)

type jsonBinding struct{}

func (b *jsonBinding) BindBody(body io.Reader, obj any, opts ...BindBodyOption) error {
	bindBodyOptions := &bindBodyOptions{
		DisallowUnknownFields: false,
		UseNumber:             false,
	}

	for _, opt := range opts {
		opt(bindBodyOptions)
	}

	decoder := json.NewDecoder(body)

	if bindBodyOptions.DisallowUnknownFields {
		decoder.DisallowUnknownFields()
	}

	if bindBodyOptions.UseNumber {
		decoder.UseNumber()
	}

	if err := decoder.Decode(obj); err != nil {
		var syntaxError *json.SyntaxError
		var unmarshalError *json.InvalidUnmarshalError
		var unmarshalTypeError *json.UnmarshalTypeError

		if errors.As(err, &syntaxError) || errors.As(err, &unmarshalError) || errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
			return errors.
				New(errors.TypeInvalidInput, ErrCodeInvalidRequestBody, ErrMessageInvalidJSON).
				WithAdditional(err.Error())
		}

		if errors.As(err, &unmarshalTypeError) {
			if unmarshalTypeError.Field != "" {
				return errors.
					New(errors.TypeInvalidInput, ErrCodeInvalidRequestField, ErrMessageInvalidField).
					WithAdditional("value of type '" + unmarshalTypeError.Value + "' was received for field '" + unmarshalTypeError.Field + "', try sending '" + unmarshalTypeError.Type.String() + "' instead?")
			}

			return errors.
				New(errors.TypeInvalidInput, ErrCodeInvalidRequestField, ErrMessageInvalidField).
				WithAdditional("value of type '" + unmarshalTypeError.Value + "' was received, try sending '" + unmarshalTypeError.Type.String() + "' instead?")
		}

		// DisallowUnknownFields surfaces a bare `json: unknown field "x"`; turn it
		// into a structured invalid-input error with did-you-mean/valid-reference
		// suggestions drawn from obj's own JSON field names. Gated on the strict
		// flag so an already-structured "unknown field" error bubbling up from a
		// nested UnmarshalJSON is passed through unchanged, not re-wrapped here with
		// the wrong (outer) field set.
		if bindBodyOptions.DisallowUnknownFields && strings.Contains(err.Error(), "unknown field") {
			if field := extractUnknownField(err.Error()); field != "" {
				message := "unknown field %q"
				if bindBodyOptions.UnknownFieldContext != "" {
					message = "unknown field %q in " + bindBodyOptions.UnknownFieldContext
				}

				return errors.
					NewInvalidInputf(errors.CodeInvalidInput, message, field).
					WithSuggestions(errors.NewSuggestionsOnLevenshteinDistance(field, errors.NounFields, jsonschema.JSONFieldNames(obj))...)
			}
		}

		return err
	}

	return nil
}

// extractUnknownField pulls fieldname out of a `json: unknown field "fieldname"`
// decoder message, or returns "" when the message has no quoted field.
func extractUnknownField(errMsg string) string {
	parts := strings.Split(errMsg, `"`)

	if len(parts) >= 2 {
		return parts[1]
	}

	return ""
}
