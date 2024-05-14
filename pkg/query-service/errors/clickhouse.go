package errors

import "errors"

type ResourceLimitError struct {
	err error
}

func NewResourceLimitError(err error) error {
	return &ResourceLimitError{err: err}
}

func (e *ResourceLimitError) Error() string {
	return e.err.Error()
}

func (e *ResourceLimitError) Unwrap() error {
	return e.err
}

func IsResourceLimitError(err error) bool {
	if err == nil {
		return false
	}
	var target *ResourceLimitError
	return errors.As(err, &target)
}
