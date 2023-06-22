package utils

import (
	"math"
	"time"

	"go.uber.org/zap"
)

func Elapsed(funcName string, args ...interface{}) func() {
	start := time.Now()
	return func() {
		zap.S().Infof("func %s took %v with args %v", funcName, time.Since(start), args)
	}
}

// GetZerosForEpochNano returns the number of zeros to be appended to the epoch time for converting it to nanoseconds
func GetZerosForEpochNano(epoch int64) int64 {
	count := 0
	if epoch == 0 {
		count = 1
	} else {
		for epoch != 0 {
			epoch /= 10
			count++
		}
	}
	return int64(math.Pow(10, float64(19-count)))
}
