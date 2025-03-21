package instrumentation

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/SigNoz/signoz/pkg/instrumentation/loghandler"
	"github.com/go-kit/log"
	"github.com/go-kit/log/level"
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

type gokitLogger struct {
	handler    slog.Handler
	messageKey string
}

func NewGoKitLoggerFromSlogHandler(handler slog.Handler, messageKey string) log.Logger {
	return &gokitLogger{handler, messageKey}
}

func (l *gokitLogger) Log(keyvals ...any) error {
	var attrs []slog.Attr
	var (
		message string
		gkl     level.Value
	)
	for i := 1; i < len(keyvals); i += 2 {
		key, ok := keyvals[i-1].(string)
		// go-kit/log keys don't have to be strings, but slog keys do.
		// Convert the go-kit key to a string with fmt.Sprint.
		if !ok {
			key = fmt.Sprint(keyvals[i-1])
		}
		if l.messageKey != "" && key == l.messageKey {
			message = fmt.Sprint(keyvals[i])
			continue
		}
		if l, ok := keyvals[i].(level.Value); ok {
			gkl = l
			continue
		}
		attrs = append(attrs, slog.Any(key, keyvals[i]))
	}

	var sl slog.Level
	if gkl != nil {
		switch gkl {
		case level.DebugValue():
			sl = slog.LevelDebug
		case level.InfoValue():
			sl = slog.LevelInfo
		case level.WarnValue():
			sl = slog.LevelWarn
		case level.ErrorValue():
			sl = slog.LevelError
		}
	}

	r := slog.NewRecord(time.Time{}, sl, message, 0)
	r.AddAttrs(attrs...)
	return l.handler.Handle(context.Background(), r)
}
