package tracefunnel

import (
	"fmt"
	tracefunnel "github.com/SigNoz/signoz/pkg/types/tracefunnel"
	"sort"
)

// ValidateTimestamp validates a timestamp
func ValidateTimestamp(timestamp int64, fieldName string) error {
	if timestamp == 0 {
		return fmt.Errorf("%s is required", fieldName)
	}
	if timestamp < 0 {
		return fmt.Errorf("%s must be positive", fieldName)
	}
	return nil
}

// ValidateTimestampIsMilliseconds validates that a timestamp is in milliseconds
func ValidateTimestampIsMilliseconds(timestamp int64) bool {
	return timestamp >= 1000000000000 && timestamp <= 9999999999999
}

func ValidateFunnelSteps(steps []tracefunnel.FunnelStep) error {
	if len(steps) < 2 {
		return fmt.Errorf("funnel must have at least 2 steps")
	}

	for i, step := range steps {
		if step.ServiceName == "" {
			return fmt.Errorf("step %d: service name is required", i+1)
		}
		if step.SpanName == "" {
			return fmt.Errorf("step %d: span name is required", i+1)
		}
		if step.Order < 0 {
			return fmt.Errorf("step %d: order must be non-negative", i+1)
		}
	}

	return nil
}

// NormalizeFunnelSteps normalizes step orders to be sequential
func NormalizeFunnelSteps(steps []tracefunnel.FunnelStep) []tracefunnel.FunnelStep {
	sort.Slice(steps, func(i, j int) bool {
		return steps[i].Order < steps[j].Order
	})

	for i := range steps {
		steps[i].Order = int64(i + 1)
	}

	return steps
}
