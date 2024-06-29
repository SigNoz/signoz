package utils

import (
	"time"

	"go.uber.org/zap"
)

func Elapsed(funcName string, args map[string]interface{}) func() {
	start := time.Now()
	return func() {
		var zapFields []zap.Field
		zapFields = append(zapFields, zap.String("func_name", funcName), zap.Duration("duration", time.Since(start)))
		for k, v := range args {
			zapFields = append(zapFields, zap.Any(k, v))
		}
		zap.L().Info("Elapsed time", zapFields...)
	}
}
