package model

import (
	basemodel "go.signoz.io/query-service/model"
)

type ApiError struct {
	basemodel.ApiError
}

// NewApiError returns a ApiError object of given type
func NewApiError(typ basemodel.ErrorType, err error) *ApiError {
	return &ApiError{
		basemodel.ApiError{
			Typ: typ,
			Err: err,
		},
	}
}

// NewBadRequestError returns a ApiError object of bad request
func NewBadRequestError(err error) *ApiError {
	return &ApiError{
		basemodel.ApiError{
			Typ: basemodel.ErrorBadData,
			Err: err,
		},
	}
}

// NewInternalError returns a ApiError object of internal type
func NewInternalError(err error) *ApiError {
	return &ApiError{
		basemodel.ApiError{
			Typ: basemodel.ErrorInternal,
			Err: err,
		},
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
