package utils

import (
	"time"

	"go.uber.org/zap"
)

func Elapsed(funcName string, args ...interface{}) func() {
	start := time.Now()
	return func() {
		zap.S().Infof("func %s took %v with args %v", funcName, time.Since(start), args)
	}
}
