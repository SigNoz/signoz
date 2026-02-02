package instrumentation

import (
	"log/slog"
	"os"

	"github.com/SigNoz/signoz/pkg/instrumentation/loghandler"
	"go.uber.org/zap" //nolint:depguard
)

type zapToSlogConverter struct{}

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

func NewZapToSlogConverter() ZapToSlogConverter {
	return &zapToSlogConverter{}
}

func (*zapToSlogConverter) FieldsToAttributes(fields []zap.Field) []any {
	// for each KV pair
	args := make([]any, 0, len(fields)*2)
	for _, f := range fields {
		args = append(args, f.Key)

		switch {
		case f.Interface != nil:
			args = append(args, f.Interface)
		case f.String != "":
			args = append(args, f.String)
		default:
			args = append(args, f.Integer)
		}
	}

	return args
}
