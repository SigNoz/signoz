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
		zap.L().Info("func %s took %v with args %v", zap.String("func_name", funcName), zap.Duration("duration", time.Since(start)), zap.String("args", argsStr))
	}
}
