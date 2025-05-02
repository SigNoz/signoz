package loghandler

import (
	"context"
	"log/slog"
)

// LogHandlerFunc is to LogHandler as http.HandlerFunc is to http.Handler
type LogHandlerFunc func(ctx context.Context, r slog.Record) error

// LogHandlerFunc implements LogHandler
func (m LogHandlerFunc) Handle(ctx context.Context, r slog.Record) error {
	return m(ctx, r)
}

type LogHandler interface {
	Handle(ctx context.Context, r slog.Record) error
}

// Wrapper is an interface implemented by all log handlers
type Wrapper interface {
	Wrap(LogHandler) LogHandler
}

type WrapperFunc func(LogHandler) LogHandler

func (m WrapperFunc) Wrap(next LogHandler) LogHandler {
	return m(next)
}

// Merge wraps the given wrappers into a single wrapper.
func MergeLogHandlerWrappers(handlers ...Wrapper) Wrapper {
	return WrapperFunc(func(next LogHandler) LogHandler {
		for i := len(handlers) - 1; i >= 0; i-- {
			next = handlers[i].Wrap(next)
		}
		return next
	})
}

type handler struct {
	base     slog.Handler
	wrappers []Wrapper
}

func New(base slog.Handler, wrappers ...Wrapper) *handler {
	return &handler{base: base, wrappers: wrappers}
}

func (h *handler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.base.Enabled(ctx, level)
}

func (h *handler) Handle(ctx context.Context, r slog.Record) error {
	return MergeLogHandlerWrappers(h.wrappers...).Wrap(h.base).Handle(ctx, r)
}

func (h *handler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &handler{base: h.base.WithAttrs(attrs), wrappers: h.wrappers}
}

func (h *handler) WithGroup(name string) slog.Handler {
	return &handler{base: h.base.WithGroup(name), wrappers: h.wrappers}
}
