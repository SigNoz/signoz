package instrumentation

import (
	"log/slog"
	"os"

	"go.signoz.io/signoz/pkg/instrumentation/loghandler"
)

func NewLogger(config Config, wrappers ...loghandler.Wrapper) *slog.Logger {
	logger := slog.New(
		loghandler.New(
			slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: config.Logs.Level, AddSource: true}),
			wrappers...,
		),
	)

	slog.SetDefault(logger)
	_ = slog.SetLogLoggerLevel(config.Logs.Level)

	return logger
}
