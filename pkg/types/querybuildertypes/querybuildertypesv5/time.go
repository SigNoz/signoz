package querybuildertypesv5

import "math"

// ToMilliSecs takes an epoch whose resolution is inferred from its magnitude
// (s/ms/µs/ns) and returns it in milliseconds. A millisecond epoch for the
// current era has 13 digits (e.g. ~1.7e12 in 2026), so the value is scaled so
// its digit-width matches: smaller values (seconds) are scaled up, larger ones
// (micro/nanoseconds) are scaled down. Zero is returned unchanged.
func ToMilliSecs(epoch uint64) uint64 {
	if epoch == 0 {
		return 0
	}
	temp := epoch
	count := 0
	for epoch != 0 {
		epoch /= 10
		count++
	}
	const msDigits = 13
	if count < msDigits {
		return temp * uint64(math.Pow(10, float64(msDigits-count)))
	}
	return temp / uint64(math.Pow(10, float64(count-msDigits)))
}
