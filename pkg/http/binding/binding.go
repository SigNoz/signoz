package binding

import (
	"io"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	ErrCodeInvalidRequestBody  = errors.MustNewCode("invalid_request_body")
	ErrCodeInvalidRequestField = errors.MustNewCode("invalid_request_field")
)

var (
	JSON Binding = &jsonBinding{}
)

type bindBodyOptions struct {
	DisallowUnknownFields bool
	UseNumber             bool
}

type BindBodyOption func(*bindBodyOptions)

func WithDisallowUnknownFields(disallowUnknownFields bool) BindBodyOption {
	return func(options *bindBodyOptions) {
		options.DisallowUnknownFields = disallowUnknownFields
	}
}

func WithUseNumber(useNumber bool) BindBodyOption {
	return func(options *bindBodyOptions) {
		options.UseNumber = useNumber
	}
}

type Binding interface {
	BindBody(body io.Reader, obj any, opts ...BindBodyOption) error
}
