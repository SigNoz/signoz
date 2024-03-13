package utils

import (
	"fmt"
	"time"

	"go.uber.org/zap"
)

func Elapsed(funcName string, args ...interface{}) func() {
	start := time.Now()
	argsStr := ""
	for _, v := range args {
		argsStr += fmt.Sprintf("%v, ", v)
	}
	argsStr = argsStr[:len(argsStr)-2]
	return func() {
		zap.S().Infof("func %s took %v with args %v", funcName, time.Since(start), string(argsStr))
	}
}
