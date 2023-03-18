package worker

import (
	"go.opentelemetry.io/collector/receiver/otlpreceiver"
)

func MakeConfig(i interface{}) otlpreceiver.Config {
	return i.(otlpreceiver.Config)
}
