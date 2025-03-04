package factorytest

import (
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/instrumentation/instrumentationtest"
)

func NewSettings() factory.ProviderSettings {
	return instrumentationtest.New().ToProviderSettings()
}
