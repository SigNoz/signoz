package traceFunnels

import (
	"fmt"
	"sort"
)

// ValidateFunnelSteps validates funnel steps and ensures they have unique and correct order
// Rules: At least 2 steps, max 3 steps, orders must be unique and include 1 and 2
func ValidateFunnelSteps(steps []FunnelStep) error {
	if len(steps) < 2 {
		return fmt.Errorf("at least 2 funnel steps are required")
	}

	if len(steps) > 3 {
		return fmt.Errorf("maximum 3 funnel steps are allowed")
	}

	orderMap := make(map[int64]bool)

	for _, step := range steps {
		if orderMap[step.StepOrder] {
			return fmt.Errorf("duplicate step order: %d", step.StepOrder)
		}
		orderMap[step.StepOrder] = true

		if step.StepOrder < 1 || step.StepOrder > 3 {
			return fmt.Errorf("step order must be between 1 and 3, got: %d", step.StepOrder)
		}
	}

	if !orderMap[1] || !orderMap[2] {
		return fmt.Errorf("funnel steps with orders 1 and 2 are mandatory")
	}

	return nil
}

// NormalizeFunnelSteps ensures steps have sequential orders starting from 1
// This sorts steps by order and then reassigns orders to be sequential
func NormalizeFunnelSteps(steps []FunnelStep) []FunnelStep {
	// Create a copy of the input slice
	sortedSteps := make([]FunnelStep, len(steps))
	copy(sortedSteps, steps)

	// Sort using Go's built-in sort.Slice function
	sort.Slice(sortedSteps, func(i, j int) bool {
		return sortedSteps[i].StepOrder < sortedSteps[j].StepOrder
	})

	// Normalize orders to be sequential starting from 1
	for i := 0; i < len(sortedSteps); i++ {
		sortedSteps[i].StepOrder = int64(i + 1)
	}

	return sortedSteps
}
