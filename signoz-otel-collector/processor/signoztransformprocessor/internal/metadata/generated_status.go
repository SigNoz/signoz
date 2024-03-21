package metadata

import (
	"go.opentelemetry.io/collector/component"
)

const (
	Type             = "signoztransform"
	TracesStability  = component.StabilityLevelAlpha
	MetricsStability = component.StabilityLevelAlpha
	LogsStability    = component.StabilityLevelAlpha
)
