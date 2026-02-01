package binding

import (
	"io"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	ErrCodeInvalidRequestBody  = errors.MustNewCode("invalid_request_body")
	ErrCodeInvalidRequestField = errors.MustNewCode("invalid_request_field")
	ErrCodeInvalidRequestQuery = errors.MustNewCode("invalid_request_query")
)

var (
	JSON  BindingBody  = &jsonBinding{}
	Query BindingQuery = &queryBinding{}
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

type BindingBody interface {
	BindBody(body io.Reader, obj any, opts ...BindBodyOption) error
}

type BindingQuery interface {
	BindQuery(query map[string][]string, obj any) error
}
