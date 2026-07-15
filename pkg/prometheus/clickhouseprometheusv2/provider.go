package clickhouseprometheusv2

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/storage"
)

// Provider ties the package together: its own engine and parser, the
// ClickHouse client behind the native storage.Querier, and the transpiler
// executor. See the package documentation for what runs where and why. It is
// exported as a concrete type — pkg/querier holds it directly for shadow
// comparison and pinned serving, and an interface with a single
// implementation would only hide that dependency.
type Provider struct {
	settings factory.ScopedProviderSettings
	engine   *prometheus.Engine
	parser   prometheus.Parser
	client   *client
	executor *executor
}

var (
	_ prometheus.Prometheus        = (*Provider)(nil)
	_ prometheus.StatementCapturer = (*Provider)(nil)
)

func NewFactory(telemetryStore telemetrystore.TelemetryStore) factory.ProviderFactory[prometheus.Prometheus, prometheus.Config] {
	return factory.NewProviderFactory(factory.MustNewName("clickhousev2"), func(ctx context.Context, providerSettings factory.ProviderSettings, config prometheus.Config) (prometheus.Prometheus, error) {
		return New(ctx, providerSettings, config, telemetryStore)
	})
}

func New(_ context.Context, providerSettings factory.ProviderSettings, config prometheus.Config, telemetryStore telemetrystore.TelemetryStore) (*Provider, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/prometheus/clickhouseprometheusv2")

	engine := prometheus.NewEngine(settings.Logger(), config)
	parser := prometheus.NewParser()
	client := newClient(settings, telemetryStore, config)

	return &Provider{
		settings: settings,
		engine:   engine,
		parser:   parser,
		client:   client,
		executor: &executor{client: client, engine: engine, parser: parser},
	}, nil
}

// TryExecuteRange evaluates transpilable query shapes directly in ClickHouse
// (see transpiler.go). ok=false means the shape is not transpilable and the
// caller should evaluate through Engine over Storage instead.
func (p *Provider) TryExecuteRange(ctx context.Context, query string, start, end time.Time, step time.Duration) (promql.Matrix, bool, error) {
	return p.executor.TryExecuteRange(ctx, query, start, end, step)
}

func (p *Provider) Engine() *prometheus.Engine {
	return p.engine
}

func (p *Provider) Parser() prometheus.Parser {
	return p.parser
}

func (p *Provider) Storage() storage.Queryable {
	return p
}

func (p *Provider) Querier(mint, maxt int64) (storage.Querier, error) {
	return &querier{mint: mint, maxt: maxt, client: p.client}, nil
}

// CapturingStorage implements prometheus.StatementCapturer: a storage that
// records each selector's SQL without executing it, for the preview path.
// A fresh recorder per call keeps concurrent dry-runs isolated.
func (p *Provider) CapturingStorage() (storage.Queryable, prometheus.StatementRecorder) {
	recorder := &statementRecorder{}
	return &captureQueryable{client: p.client, recorder: recorder}, recorder
}
