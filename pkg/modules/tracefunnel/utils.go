package tracefunnel

import (
	"fmt"
	tf "github.com/SigNoz/signoz/pkg/types/tracefunnel"
	"sort"
)

// ValidateSteps checks if the requested steps exist in the funnel
func ValidateSteps(funnel *tf.Funnel, stepAOrder, stepBOrder int64) error {
	stepAExists, stepBExists := false, false
	for _, step := range funnel.Steps {
		if step.Order == stepAOrder {
			stepAExists = true
		}
		if step.Order == stepBOrder {
			stepBExists = true
		}
	}

	if !stepAExists || !stepBExists {
		return fmt.Errorf("one or both steps not found. Step A Order: %d, Step B Order: %d", stepAOrder, stepBOrder)
	}

	return nil
}

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
	// Check if timestamp is in milliseconds (13 digits)
	return timestamp >= 1000000000000 && timestamp <= 9999999999999
}

// ValidateFunnelSteps validates funnel steps
func ValidateFunnelSteps(steps []tf.FunnelStep) error {
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
func NormalizeFunnelSteps(steps []tf.FunnelStep) []tf.FunnelStep {
	// Sort steps by order
	sort.Slice(steps, func(i, j int) bool {
		return steps[i].Order < steps[j].Order
	})

	// Normalize orders to be sequential
	for i := range steps {
		steps[i].Order = int64(i + 1)
	}

	return steps
}
