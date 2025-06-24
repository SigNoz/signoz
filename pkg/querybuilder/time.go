package querybuilder

import (
	"fmt"
	"math"
)

const (
	NsToSeconds      = 1000000000
	BucketAdjustment = 1800 // 30 minutes

	RecommendedNumberOfPoints = 300
	MaxAllowedNumberOfPoints  = 1500
	MaxAllowedSeries          = 3000
)

// ToNanoSecs takes epoch and returns it in ns
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

func RecommendedStepInterval(start, end uint64) uint64 {
	start = ToNanoSecs(start)
	end = ToNanoSecs(end)

	step := (end - start) / RecommendedNumberOfPoints / 1e9

	if step < 5 {
		return 5
	}

	// return the nearest lower multiple of 5
	return step - step%5
}

func MinAllowedStepInterval(start, end uint64) uint64 {
	start = ToNanoSecs(start)
	end = ToNanoSecs(end)

	step := (end - start) / MaxAllowedNumberOfPoints / 1e9

	if step < 5 {
		return 5
	}

	// return the nearest lower multiple of 5
	return step - step%5
}

func RecommendedStepIntervalForMetric(start, end uint64) uint64 {
	start = ToNanoSecs(start)
	end = ToNanoSecs(end)

	step := (end - start) / RecommendedNumberOfPoints / 1e9

	// TODO(srikanthccv): make this make use of the reporting frequency and remove the 60
	if step < 60 {
		return 60
	}

	// return the nearest lower multiple of 60
	return step - step%60
}

func MinAllowedStepIntervalForMetric(start, end uint64) uint64 {
	start = ToNanoSecs(start)
	end = ToNanoSecs(end)

	step := (end - start) / RecommendedNumberOfPoints / 1e9

	// TODO(srikanthccv): make this make use of the reporting frequency and remove the 60
	if step < 60 {
		return 60
	}

	// return the nearest lower multiple of 60
	return step - step%60
}

func AssignReservedVars(vars map[string]any, start, end uint64) {
	start = ToNanoSecs(start)
	end = ToNanoSecs(end)

	vars["start_timestamp"] = start / 1_000_000_000
	vars["end_timestamp"] = end / 1_000_000_000
	vars["start_timestamp_ms"] = start / 1_000_000
	vars["end_timestamp_ms"] = end / 1_000_000
	vars["SIGNOZ_START_TIME"] = start / 1_000_000
	vars["SIGNOZ_END_TIME"] = end / 1_000_000
	vars["start_timestamp_nano"] = start
	vars["end_timestamp_nano"] = end
	vars["start_datetime"] = fmt.Sprintf("toDateTime(%d)", start/1_000_000_000)
	vars["end_datetime"] = fmt.Sprintf("toDateTime(%d)", end/1_000_000_000)
}
