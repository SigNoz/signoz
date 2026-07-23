package slo

import "math"

func BurnRate(errorRate, target float64) float64 {
	allowed := 1 - target
	if allowed <= 0 {
		if errorRate <= 0 {
			return 0
		}
		return math.Inf(1)
	}
	return errorRate / allowed
}

func RemainingBudget(errorRate, target float64) float64 {
	if target >= 1 {
		if errorRate <= 0 {
			return 1
		}
		return 0
	}
	remaining := 1 - BurnRate(errorRate, target)
	if remaining < 0 {
		return 0
	}
	if remaining > 1 {
		return 1
	}
	return remaining
}
