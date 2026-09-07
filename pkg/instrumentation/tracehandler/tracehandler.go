package tracehandler

import (
	"context"

	"go.opentelemetry.io/otel/trace"
	"go.opentelemetry.io/otel/trace/embedded"
)

// StartFunc is to trace.Tracer.Start as loghandler.LogHandlerFunc is to
// loghandler.LogHandler.
type StartFunc func(ctx context.Context, spanName string, opts ...trace.SpanStartOption) (context.Context, trace.Span)

// Wrapper is an interface implemented by all trace handlers. scope is the
// instrumentation scope name of the tracer being wrapped; a wrapper that
// does not apply to a scope returns next unchanged.
type Wrapper interface {
	Wrap(scope string, next StartFunc) StartFunc
}

type WrapperFunc func(scope string, next StartFunc) StartFunc

func (m WrapperFunc) Wrap(scope string, next StartFunc) StartFunc {
	return m(scope, next)
}

type provider struct {
	embedded.TracerProvider
	base     trace.TracerProvider
	wrappers []Wrapper
}

func New(base trace.TracerProvider, wrappers ...Wrapper) trace.TracerProvider {
	return &provider{base: base, wrappers: wrappers}
}

func (p *provider) Tracer(name string, opts ...trace.TracerOption) trace.Tracer {
	base := p.base.Tracer(name, opts...)
	start := StartFunc(base.Start)
	for i := len(p.wrappers) - 1; i >= 0; i-- {
		start = p.wrappers[i].Wrap(name, start)
	}
	return &tracer{start: start}
}

type tracer struct {
	embedded.Tracer
	start StartFunc
}

func (t *tracer) Start(ctx context.Context, spanName string, opts ...trace.SpanStartOption) (context.Context, trace.Span) {
	return t.start(ctx, spanName, opts...)
}
