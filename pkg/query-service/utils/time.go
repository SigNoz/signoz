package utils

import (
	"time"

	"go.uber.org/zap"
)

func Elapsed(funcName string) func() {
	start := time.Now()
	return func() {
		zap.S().Infof("%s took %v\n", funcName, time.Since(start))
	}
}
