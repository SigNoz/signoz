package telemetrystorehook

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/metric"
	semconv "go.opentelemetry.io/otel/semconv/v1.12.0"
	"go.opentelemetry.io/otel/trace"
)

type instrumentation struct {
	clickhouseVersion string
	clickhouseCluster string
	tracer            trace.Tracer
	meter             metric.Meter
}

func NewInstrumentationFactory(version string) factory.ProviderFactory[telemetrystore.TelemetryStoreHook, telemetrystore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("instrumentation"), func(ctx context.Context, ps factory.ProviderSettings, c telemetrystore.Config) (telemetrystore.TelemetryStoreHook, error) {
		return NewInstrumentation(ctx, ps, c, version)
	})
}

func NewInstrumentation(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config, version string) (telemetrystore.TelemetryStoreHook, error) {
	meter := providerSettings.MeterProvider.Meter("github.com/SigNoz/signoz/pkg/telemetrystore")

	return &instrumentation{
		clickhouseVersion: version,
		clickhouseCluster: config.Clickhouse.Cluster,
		tracer:            providerSettings.TracerProvider.Tracer("github.com/SigNoz/signoz/pkg/telemetrystore"),
		meter:             meter,
	}, nil
}

func (hook *instrumentation) BeforeQuery(ctx context.Context, event *telemetrystore.QueryEvent) context.Context {
	ctx, _ = hook.tracer.Start(ctx, "", trace.WithSpanKind(trace.SpanKindClient))
	return ctx
}

func (hook *instrumentation) AfterQuery(ctx context.Context, event *telemetrystore.QueryEvent) {
	span := trace.SpanFromContext(ctx)
	if !span.IsRecording() {
		return
	}

	span.SetName(event.Operation)
	defer span.End()

	var attrs []attribute.KeyValue
	attrs = append(
		attrs,
		semconv.DBStatementKey.String(event.Query),
		attribute.String("db.version", hook.clickhouseVersion),
		semconv.DBSystemKey.String("clickhouse"),
		semconv.DBOperationKey.String(event.Operation),
		attribute.String("clickhouse.cluster", hook.clickhouseCluster),
	)

	if event.Err != nil {
		span.RecordError(event.Err)
		span.SetStatus(codes.Error, event.Err.Error())
	}

	span.SetAttributes(attrs...)
}
