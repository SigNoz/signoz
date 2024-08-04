package otel

import (
	"context"

	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.25.0"
	"go.opentelemetry.io/otel/trace"
)

const (
	TraceIdLogKey                     string = "trace_id"
	SpanIdLogKey                      string = "span_id"
	DeploymentEnvironmentValueUnknown string = "unknown_environment"
)

func NewResource(ctx context.Context) (*resource.Resource, error) {
	res, err := resource.New(
		ctx,
		resource.WithContainer(),
		resource.WithFromEnv(),
		resource.WithProcess(),
		resource.WithTelemetrySDK(),
		resource.WithHost(),
	)
	if err != nil {
		return nil, err
	}

	return res, nil
}

func GetServiceName(resource *resource.Resource) string {
	val, ok := resource.Set().Value(semconv.ServiceNameKey)
	if !ok {
		return "unknown_service:go"
	}

	return val.AsString()
}

func GetTraceIdAndSpanId(ctx context.Context) (string, string, bool) {
	span := trace.SpanFromContext(ctx)

	if ok := span.SpanContext().HasTraceID(); ok {
		if ok := span.SpanContext().HasSpanID(); ok {
			return span.SpanContext().TraceID().String(), span.SpanContext().SpanID().String(), true
		}
	}

	return "", "", false
}

func GetEnvironment(resource *resource.Resource) string {
	val, ok := resource.Set().Value(semconv.DeploymentEnvironmentKey)
	if !ok {
		return DeploymentEnvironmentValueUnknown
	}

	return val.AsString()
}
