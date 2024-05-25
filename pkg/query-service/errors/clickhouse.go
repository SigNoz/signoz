package errors

import "errors"

var (
	// ErrResourceBytesLimitExceeded is returned when the resource bytes limit is exceeded
	ErrResourceBytesLimitExceeded = NewResourceLimitError(errors.New("resource bytes limit exceeded, try applying filters such as service.name, etc. to reduce the data size"))
	// ErrResourceTimeLimitExceeded is returned when the resource time limit is exceeded
	ErrResourceTimeLimitExceeded = NewResourceLimitError(errors.New("resource time limit exceeded, try applying filters such as service.name, etc. to reduce the data size"))
)

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

func (e *ResourceLimitError) MarshalJSON() ([]byte, error) {
	return []byte(`"` + e.Error() + `"`), nil
}

func (e *ResourceLimitError) UnmarshalJSON([]byte) error {
	return nil
}
