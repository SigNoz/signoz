package zap

import (
	"context"
	"errors"
	"runtime"
	"syscall"

	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"go.signoz.io/signoz/pkg/log"
	"go.signoz.io/signoz/pkg/otel"

	semconv "go.opentelemetry.io/otel/semconv/v1.17.0"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type zapLogger struct {
	l *zap.SugaredLogger
}

func NewLogger(level string) (log.Logger, error) {
	// Get atomic level from string level
	parsedLevel, err := zap.ParseAtomicLevel(level)
	if err != nil {
		return nil, err
	}

	cfg := zap.NewProductionConfig()
	cfg.Level = parsedLevel
	cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	cfg.EncoderConfig.TimeKey = "timestamp"

	return &zapLogger{
		l: zap.Must(cfg.Build()).Sugar(),
	}, nil
}

func (l *zapLogger) With(fields ...interface{}) log.Logger {
	return &zapLogger{
		l: l.l.With(fields...),
	}
}

func (l *zapLogger) Debugctx(ctx context.Context, msg string, fields ...interface{}) {
	fields = append(fields, l.fieldsctx(ctx, zapcore.DebugLevel, msg)...)
	l.l.WithOptions(zap.AddCallerSkip(1)).Debugw(msg, fields...)
}

func (l *zapLogger) Infoctx(ctx context.Context, msg string, fields ...interface{}) {
	fields = append(fields, l.fieldsctx(ctx, zapcore.InfoLevel, msg)...)
	l.l.WithOptions(zap.AddCallerSkip(1)).Infow(msg, fields...)
}

func (l *zapLogger) Warnctx(ctx context.Context, msg string, fields ...interface{}) {
	fields = append(fields, l.fieldsctx(ctx, zapcore.WarnLevel, msg)...)
	l.l.WithOptions(zap.AddCallerSkip(1)).Warnw(msg, fields...)
}

func (l *zapLogger) Errorctx(ctx context.Context, msg string, fields ...interface{}) {
	fields = append(fields, l.fieldsctx(ctx, zapcore.ErrorLevel, msg)...)
	l.l.WithOptions(zap.AddCallerSkip(1)).Errorw(msg, fields...)
}

func (l *zapLogger) Panicctx(ctx context.Context, msg string, fields ...interface{}) {
	fields = append(fields, l.fieldsctx(ctx, zapcore.PanicLevel, msg)...)
	l.l.WithOptions(zap.AddCallerSkip(1)).Panicw(msg, fields...)
}

func (l *zapLogger) Fatalctx(ctx context.Context, msg string, fields ...interface{}) {
	fields = append(fields, l.fieldsctx(ctx, zapcore.FatalLevel, msg)...)
	l.l.WithOptions(zap.AddCallerSkip(1)).Fatalw(msg, fields...)
}

func (l *zapLogger) Debug(msg string, fields ...interface{}) {
	l.l.WithOptions(zap.AddCallerSkip(1)).Debugw(msg, fields...)
}

func (l *zapLogger) Info(msg string, fields ...interface{}) {
	l.l.WithOptions(zap.AddCallerSkip(1)).Infow(msg, fields...)
}

func (l *zapLogger) Warn(msg string, fields ...interface{}) {
	l.l.WithOptions(zap.AddCallerSkip(1)).Warnw(msg, fields...)
}

func (l *zapLogger) Error(msg string, fields ...interface{}) {
	l.l.WithOptions(zap.AddCallerSkip(1)).Errorw(msg, fields...)
}

func (l *zapLogger) Panic(msg string, fields ...interface{}) {
	l.l.WithOptions(zap.AddCallerSkip(1)).Panicw(msg, fields...)
}

func (l *zapLogger) Fatal(msg string, fields ...interface{}) {
	l.l.WithOptions(zap.AddCallerSkip(1)).Fatalw(msg, fields...)
}

func (l *zapLogger) Flush() error {
	err := l.l.Sync()
	if err == nil {
		return nil
	}

	switch {
	case errors.Is(err, syscall.ENOTTY):
		// This is a known issue with Zap when redirecting stdout/stderr to a console
		// https://github.com/uber-go/zap/issues/880#issuecomment-1181854418
		return nil
	default:
		return err
	}
}

func (l *zapLogger) Getl() *zap.Logger {
	return l.l.Desugar()
}

func (l *zapLogger) fieldsctx(ctx context.Context, lvl zapcore.Level, msg string) []interface{} {
	var fields []interface{}

	traceId, spanId, ok := otel.GetTraceIdAndSpanId(ctx)
	if ok {
		fields = append(fields, otel.TraceIdLogKey, traceId)
		fields = append(fields, otel.SpanIdLogKey, spanId)

	}

	if lvl >= zap.ErrorLevel {
		span := trace.SpanFromContext(ctx)
		if span.IsRecording() {
			span.SetStatus(codes.Error, msg)
		}

		if fn, file, line, ok := runtimeCaller(3); ok {
			if fn != "" {
				fields = append(fields, string(semconv.CodeFunctionKey), fn)
			}
			if file != "" {
				fields = append(fields, string(semconv.CodeFilepathKey), file)
				fields = append(fields, string(semconv.CodeLineNumberKey), line)
			}
		}
	}

	return fields
}

func runtimeCaller(skip int) (fn, file string, line int, ok bool) {
	rpc := make([]uintptr, 1)
	n := runtime.Callers(skip+1, rpc[:])
	if n < 1 {
		return
	}
	frame, _ := runtime.CallersFrames(rpc).Next()
	return frame.Function, frame.File, frame.Line, frame.PC != 0
}
