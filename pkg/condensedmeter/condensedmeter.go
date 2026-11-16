package condensedmeter

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

var (
	ErrCodeInvalidInput = errors.MustNewCode("condensedmeter_invalid_input")
)

type Reporter interface {
	factory.ServiceWithHealthy
}
