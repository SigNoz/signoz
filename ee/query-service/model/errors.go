package model

import (
	"fmt"

	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

type ApiError struct {
	Typ basemodel.ErrorType
	Err error
}

func (a *ApiError) Type() basemodel.ErrorType {
	return a.Typ
}

func (a *ApiError) ToError() error {
	if a != nil {
		return a.Err
	}
	return a.Err
}

func (a *ApiError) Error() string {
	return a.Err.Error()
}

func (a *ApiError) IsNil() bool {
	return a == nil || a.Err == nil
}

// NewApiError returns a ApiError object of given type
func NewApiError(typ basemodel.ErrorType, err error) *ApiError {
	return &ApiError{
		Typ: typ,
		Err: err,
	}
}

// BadRequest returns a ApiError object of bad request
func BadRequest(err error) *ApiError {
	return &ApiError{
		Typ: basemodel.ErrorBadData,
		Err: err,
	}
}

func Unauthorized(err error) *ApiError {
	return &ApiError{
		Typ: basemodel.ErrorUnauthorized,
		Err: err,
	}
}

// BadRequestStr returns a ApiError object of bad request for string input
func BadRequestStr(s string) *ApiError {
	return &ApiError{
		Typ: basemodel.ErrorBadData,
		Err: fmt.Errorf(s),
	}
}

// InternalError returns a ApiError object of internal type
func InternalError(err error) *ApiError {
	return &ApiError{
		Typ: basemodel.ErrorInternal,
		Err: err,
	}
}

// InternalErrorStr returns a ApiError object of internal type for string input
func InternalErrorStr(s string) *ApiError {
	return &ApiError{
		Typ: basemodel.ErrorInternal,
		Err: fmt.Errorf(s),
	}
}

var (
	ErrorNone                  basemodel.ErrorType = ""
	ErrorTimeout               basemodel.ErrorType = "timeout"
	ErrorCanceled              basemodel.ErrorType = "canceled"
	ErrorExec                  basemodel.ErrorType = "execution"
	ErrorBadData               basemodel.ErrorType = "bad_data"
	ErrorInternal              basemodel.ErrorType = "internal"
	ErrorUnavailable           basemodel.ErrorType = "unavailable"
	ErrorNotFound              basemodel.ErrorType = "not_found"
	ErrorNotImplemented        basemodel.ErrorType = "not_implemented"
	ErrorUnauthorized          basemodel.ErrorType = "unauthorized"
	ErrorForbidden             basemodel.ErrorType = "forbidden"
	ErrorConflict              basemodel.ErrorType = "conflict"
	ErrorStreamingNotSupported basemodel.ErrorType = "streaming is not supported"
)

func init() {
	ErrorNone = basemodel.ErrorNone
	ErrorTimeout = basemodel.ErrorTimeout
	ErrorCanceled = basemodel.ErrorCanceled
	ErrorExec = basemodel.ErrorExec
	ErrorBadData = basemodel.ErrorBadData
	ErrorInternal = basemodel.ErrorInternal
	ErrorUnavailable = basemodel.ErrorUnavailable
	ErrorNotFound = basemodel.ErrorNotFound
	ErrorNotImplemented = basemodel.ErrorNotImplemented
	ErrorUnauthorized = basemodel.ErrorUnauthorized
	ErrorForbidden = basemodel.ErrorForbidden
	ErrorConflict = basemodel.ErrorConflict
	ErrorStreamingNotSupported = basemodel.ErrorStreamingNotSupported
}

type ErrUnsupportedAuth struct{}

func (errUnsupportedAuth ErrUnsupportedAuth) Error() string {
	return "this authentication method not supported"
}
