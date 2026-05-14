package instrumentationtypes

import (
	"math"
	"time"
)

// DurationBucket returns a human-readable bucket label for the duration between fromMS and toMS.
// fromMS and toMS are Unix timestamps (same unit as used by time.Unix).
// Returns labels like "<1h", "<6h", "<24h", "<3D", "<1W", "<2W", "<1M", or ">=1M".
func DurationBucket(from, to uint64) string {
	// make sure it's nanoseconds regardless of the unit
	fromNS := ToNanoSecs(from)
	toNS := ToNanoSecs(to)

	diff := time.Unix(0, int64(toNS)).Sub(time.Unix(0, int64(fromNS)))

	buckets := []struct {
		d time.Duration
		l string
	}{
		{1 * time.Hour, "<1h"},
		{6 * time.Hour, "<6h"},
		{24 * time.Hour, "<24h"},
		{3 * 24 * time.Hour, "<3D"},
		{7 * 24 * time.Hour, "<1W"},
		{14 * 24 * time.Hour, "<2W"},
		{30 * 24 * time.Hour, "<1M"},
	}

	for _, b := range buckets {
		if diff < b.d {
			return b.l
		}
	}

	return ">=1M"
}

// ToNanoSecs takes epoch and returns it in ns.
func ToNanoSecs(epoch uint64) uint64 {
	temp := epoch
	count := 0
	if epoch == 0 {
		count = 1
	} else {
		for epoch != 0 {
			epoch /= 10
			count++
		}
	}
	return temp * uint64(math.Pow(10, float64(19-count)))
}
