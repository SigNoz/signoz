package meterreporter

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

var (
	ErrCodeInvalidInput = errors.MustNewCode("meterreporter_invalid_input")
)

type Reporter interface {
	factory.ServiceWithHealthy
}
