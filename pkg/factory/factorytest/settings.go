package factorytest

import (
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/instrumentation/instrumentationtest"
)

func NewSettings() factory.Settings {
	return instrumentationtest.New().ToFactorySettings()
}
