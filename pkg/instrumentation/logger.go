package instrumentation

import (
	"log/slog"
	"os"

	"go.signoz.io/signoz/pkg/instrumentation/loghandler"
)

func NewLogger(config Config, wrappers ...loghandler.Wrapper) *slog.Logger {
	logger := slog.New(
		loghandler.New(
			slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: config.Logs.Level, AddSource: true, ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
				// This is more in line with OpenTelemetry semantic conventions
				if a.Key == slog.SourceKey {
					a.Key = "code"
					return a
				}

				if a.Key == slog.TimeKey {
					a.Key = "timestamp"
					return a
				}

				return a
			}}),
			wrappers...,
		),
	)

	slog.SetDefault(logger)
	_ = slog.SetLogLoggerLevel(config.Logs.Level)

	return logger
}
