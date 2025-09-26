package binding

import (
	"encoding/json"
	"io"

	"github.com/SigNoz/signoz/pkg/errors"
)

const (
	ErrMessageInvalidJSON  string = "request body contains invalid JSON, please verify the format and try again."
	ErrMessageInvalidField string = "request body contains invalid field value"
)

var _ Binding = (*jsonBinding)(nil)

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

		return err
	}

	return nil
}
