// Package otlp emits reliability results as ordinary OTLP metrics.
package otlp

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/audit"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/slo"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/metric"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
)

const (
	stateUnhealthy     = 0
	stateHealthy       = 1
	stateIndeterminate = 2
)

type Emitter struct {
	provider *sdkmetric.MeterProvider

	sloCompliance metric.Float64Gauge
	sloState      metric.Float64Gauge
	sloBudget     metric.Float64Gauge
	sloBurn       metric.Float64Gauge
	auditScore    metric.Float64Gauge
	auditCoverage metric.Float64Gauge
	auditFindings metric.Int64Gauge
	mwmbFiring    metric.Int64Gauge
}

// NewEmitter creates an OTLP/HTTP metrics exporter. endpoint may be a host:port
// pair or a full URL such as http://localhost:4318.
func NewEmitter(ctx context.Context, endpoint string) (*Emitter, error) {
	host, insecure, path, err := normalizeEndpoint(endpoint)
	if err != nil {
		return nil, err
	}
	options := []otlpmetrichttp.Option{otlpmetrichttp.WithEndpoint(host)}
	if insecure {
		options = append(options, otlpmetrichttp.WithInsecure())
	}
	if path != "" {
		options = append(options, otlpmetrichttp.WithURLPath(path))
	}
	exporter, err := otlpmetrichttp.New(ctx, options...)
	if err != nil {
		return nil, fmt.Errorf("create OTLP metrics exporter: %w", err)
	}
	provider := sdkmetric.NewMeterProvider(sdkmetric.WithReader(
		sdkmetric.NewPeriodicReader(exporter, sdkmetric.WithInterval(time.Second)),
	))
	meter := provider.Meter("sre-sidekick")
	newFloat := func(name, description string) (metric.Float64Gauge, error) {
		return meter.Float64Gauge(name, metric.WithDescription(description))
	}
	compliance, err := newFloat("slo_compliance", "Measured SLI as a fraction from 0 to 1")
	if err != nil {
		return nil, err
	}
	state, err := newFloat("slo_state", "SLO state: 0 unhealthy, 1 healthy, 2 indeterminate")
	if err != nil {
		return nil, err
	}
	budget, err := newFloat("slo_error_budget_remaining", "Remaining SLO error budget")
	if err != nil {
		return nil, err
	}
	burn, err := newFloat("slo_burn_rate", "SLO error-budget burn rate")
	if err != nil {
		return nil, err
	}
	auditScore, err := newFloat("telemetry_quality_score", "Telemetry quality score from 0 to 100")
	if err != nil {
		return nil, err
	}
	auditCoverage, err := newFloat("telemetry_quality_coverage", "Telemetry audit evidence coverage")
	if err != nil {
		return nil, err
	}
	auditFindings, err := meter.Int64Gauge("telemetry_quality_findings", metric.WithDescription("Telemetry audit findings by severity"))
	if err != nil {
		return nil, err
	}
	mwmbFiring, err := meter.Int64Gauge("slo_mwmb_firing", metric.WithDescription("Multi-window multi-burn-rate alert state"))
	if err != nil {
		return nil, err
	}
	return &Emitter{
		provider: provider, sloCompliance: compliance, sloState: state,
		sloBudget: budget, sloBurn: burn, auditScore: auditScore,
		auditCoverage: auditCoverage, auditFindings: auditFindings,
		mwmbFiring: mwmbFiring,
	}, nil
}

func (e *Emitter) EmitMultiWindow(ctx context.Context, result slo.MultiWindowBurn) {
	e.mwmbFiring.Record(ctx, boolValue(result.Firing), metric.WithAttributes(
		attribute.String("service", result.Service),
		attribute.String("environment", result.Environment),
		attribute.String("slo", result.SLO),
		attribute.String("tier", result.Tier),
		attribute.String("severity", result.Severity),
	))
}

func (e *Emitter) EmitSLO(ctx context.Context, report slo.Report) {
	attrs := metric.WithAttributes(
		attribute.String("service", report.Service),
		attribute.String("environment", report.Environment),
		attribute.String("slo", report.Name),
		attribute.String("window", report.Window),
	)
	e.sloState.Record(ctx, stateValue(report.State), attrs)
	if report.State == slo.StateIndeterminate {
		return
	}
	e.sloCompliance.Record(ctx, report.SLI, attrs)
	e.sloBudget.Record(ctx, report.ErrorBudgetRemaining, attrs)
	e.sloBurn.Record(ctx, report.BurnRate, attrs)
}

func (e *Emitter) EmitAudit(ctx context.Context, report audit.Report) {
	attrs := metric.WithAttributes(
		attribute.String("service", report.Service),
		attribute.String("environment", report.Environment),
	)
	e.auditScore.Record(ctx, report.Score, attrs)
	e.auditCoverage.Record(ctx, report.Coverage, attrs)
	for _, severity := range []string{"blocker", "warning", "info"} {
		findingAttrs := metric.WithAttributes(
			attribute.String("service", report.Service),
			attribute.String("environment", report.Environment),
			attribute.String("severity", severity),
		)
		e.auditFindings.Record(ctx, int64(report.Counts[severity]), findingAttrs)
	}
}

func (e *Emitter) Shutdown(ctx context.Context) error {
	if e == nil || e.provider == nil {
		return nil
	}
	return e.provider.Shutdown(ctx)
}

func stateValue(state slo.State) float64 {
	switch state {
	case slo.StateHealthy:
		return stateHealthy
	case slo.StateIndeterminate:
		return stateIndeterminate
	default:
		return stateUnhealthy
	}
}

func boolValue(value bool) int64 {
	if value {
		return 1
	}
	return 0
}

func normalizeEndpoint(endpoint string) (host string, insecure bool, path string, err error) {
	endpoint = strings.TrimSpace(endpoint)
	if endpoint == "" {
		return "", false, "", fmt.Errorf("OTLP endpoint is required")
	}
	if !strings.Contains(endpoint, "://") {
		return strings.TrimRight(endpoint, "/"), true, "/v1/metrics", nil
	}
	parsed, parseErr := url.Parse(endpoint)
	if parseErr != nil || parsed.Host == "" {
		return "", false, "", fmt.Errorf("invalid OTLP endpoint %q", endpoint)
	}
	return parsed.Host, parsed.Scheme != "https", parsed.Path, nil
}
