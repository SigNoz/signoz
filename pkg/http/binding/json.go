package binding

import (
	"encoding/json"
	"io"

	"github.com/SigNoz/signoz/pkg/errors"
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
		return errors.
			New(errors.TypeInvalidInput, ErrCodeInvalidRequestBody, "request body is invalid").
			WithAdditional(err.Error())
	}

	return nil
}
