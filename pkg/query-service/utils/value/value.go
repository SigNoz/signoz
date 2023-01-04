package value

import (
	"math"
)

const (
	// NormalNaN is a quiet NaN. This is also math.NaN().
	NormalNaN uint64 = 0x7ff8000000000001

	// StaleNaN is a signalling NaN, due to the MSB of the mantissa being 0.
	// This value is chosen with many leading 0s, so we have scope to store more
	// complicated values in the future. It is 2 rather than 1 to make
	// it easier to distinguish from the NormalNaN by a human when debugging.
	StaleNaN uint64 = 0x7ff0000000000002
)

// IsNaN checks if the value is nan
func IsNaN(v float64) bool {
	return math.Float64bits(v) == NormalNaN
}

// IsStaleNaN returns true when the provided NaN value is a stale marker.
func IsStaleNaN(v float64) bool {
	return math.Float64bits(v) == StaleNaN
}

// Float64 returns a pointer to the float64 value passed in.
func Float64(v float64) *float64 {
	return &v
}

// Float64Value returns the value of the float64 pointer passed in or
// 0 if the pointer is nil.
func Float64Value(v *float64) float64 {
	if v != nil {
		return *v
	}
	return 0
}
