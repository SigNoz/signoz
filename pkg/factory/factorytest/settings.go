package factorytest

import (
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
)

func NewSettings() factory.ProviderSettings {
	return instrumentationtest.New().ToProviderSettings()
}
