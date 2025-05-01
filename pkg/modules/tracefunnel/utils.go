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
	// Check if timestamp is in milliseconds (13 digits)
	return timestamp >= 1000000000000 && timestamp <= 9999999999999
}

// ValidateFunnelSteps validates funnel steps
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

//// ValidateSteps checks if the requested steps exist in the funnel
//func ValidateSteps(funnel *tracefunnel.Funnel, stepAOrder, stepBOrder int64) error {
//	stepAExists, stepBExists := false, false
//	for _, step := range funnel.Steps {
//		if step.Order == stepAOrder {
//			stepAExists = true
//		}
//		if step.Order == stepBOrder {
//			stepBExists = true
//		}
//	}
//
//	if !stepAExists || !stepBExists {
//		return fmt.Errorf("one or both steps not found. Step A Order: %d, Step B Order: %d", stepAOrder, stepBOrder)
//	}
//
//	return nil
//}

//// ValidateFunnel validates a funnel's data
//func ValidateFunnel(funnel *tracefunnel.Funnel) error {
//	if funnel == nil {
//		return fmt.Errorf("funnel cannot be nil")
//	}
//
//	if len(funnel.Steps) < 2 {
//		return fmt.Errorf("funnel must have at least 2 steps")
//	}
//
//	// Validate each step
//	for i, step := range funnel.Steps {
//		if err := ValidateStep(step, i+1); err != nil {
//			return err
//		}
//	}
//
//	return nil
//}

// ValidateStep validates a single funnel step
//func ValidateStep(step tracefunnel.FunnelStep, stepNum int) error {
//	if step.ServiceName == "" {
//		return fmt.Errorf("step %d: service name is required", stepNum)
//	}
//
//	if step.SpanName == "" {
//		return fmt.Errorf("step %d: span name is required", stepNum)
//	}
//
//	if step.Order < 0 {
//		return fmt.Errorf("step %d: order must be non-negative", stepNum)
//	}
//
//	return nil
//}
//
//// ValidateTimeRange validates a time range
//func ValidateTimeRange(timeRange tracefunnel.TimeRange) error {
//	if timeRange.StartTime <= 0 {
//		return fmt.Errorf("start time must be positive")
//	}
//
//	if timeRange.EndTime <= 0 {
//		return fmt.Errorf("end time must be positive")
//	}
//
//	if timeRange.EndTime < timeRange.StartTime {
//		return fmt.Errorf("end time must be after start time")
//	}
//
//	// Check if the time range is not too far in the future
//	now := time.Now().UnixNano() / 1000000 // Convert to milliseconds
//	if timeRange.EndTime > now {
//		return fmt.Errorf("end time cannot be in the future")
//	}
//
//	// Check if the time range is not too old (e.g., more than 30 days)
//	maxAge := int64(30 * 24 * 60 * 60 * 1000) // 30 days in milliseconds
//	if now-timeRange.StartTime > maxAge {
//		return fmt.Errorf("time range cannot be older than 30 days")
//	}
//
//	return nil
//}
//
//// ValidateStepOrder validates that step orders are sequential
//func ValidateStepOrder(steps []tracefunnel.FunnelStep) error {
//	if len(steps) < 2 {
//		return nil
//	}
//
//	// Create a map to track used orders
//	usedOrders := make(map[int64]bool)
//
//	for i, step := range steps {
//		if usedOrders[step.Order] {
//			return fmt.Errorf("duplicate step order %d at step %d", step.Order, i+1)
//		}
//		usedOrders[step.Order] = true
//	}
//
//	// Check if orders are sequential
//	for i := 0; i < len(steps)-1; i++ {
//		if steps[i+1].Order != steps[i].Order+1 {
//			return fmt.Errorf("step orders must be sequential")
//		}
//	}
//
//	return nil
//}
