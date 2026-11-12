package slo

import "math"

func BurnRate(errorRate, target float64) float64 {
	allowed := 1 - target
	if allowed <= 0 {
		if errorRate <= 0 {
			return 0
		}
		// Keep reports JSON-encodable while representing an effectively
		// unbounded burn rate for a 100% target.
		return math.MaxFloat64
	}
	return errorRate / allowed
}

func RemainingBudget(errorRate, target float64) float64 {
	if target >= 1 {
		if errorRate <= 0 {
			return 1
		}
		return -math.MaxFloat64
	}
	remaining := 1 - BurnRate(errorRate, target)
	if remaining > 1 {
		return 1
	}
	return remaining
}
