package clickhouseprometheusv2

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/prometheus/prometheus/storage"
)

// provider ties the package together: its own engine and parser, and the
// ClickHouse client behind the native storage.Querier. It stays unexported:
// callers hold the prometheus.Prometheus interface, which is the boundary
// between the two provider implementations.
type provider struct {
	settings factory.ScopedProviderSettings
	engine   *prometheus.Engine
	parser   prometheus.Parser
	client   *client
}

var (
	_ prometheus.Prometheus        = (*provider)(nil)
	_ prometheus.StatementCapturer = (*provider)(nil)
)

func NewFactory(telemetryStore telemetrystore.TelemetryStore) factory.ProviderFactory[prometheus.Prometheus, prometheus.Config] {
	return factory.NewProviderFactory(factory.MustNewName("clickhousev2"), func(ctx context.Context, providerSettings factory.ProviderSettings, config prometheus.Config) (prometheus.Prometheus, error) {
		return New(ctx, providerSettings, config, telemetryStore)
	})
}

func New(_ context.Context, providerSettings factory.ProviderSettings, config prometheus.Config, telemetryStore telemetrystore.TelemetryStore) (prometheus.Prometheus, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/prometheus/clickhouseprometheusv2")

	engine := prometheus.NewEngine(settings.Logger(), config)
	parser := prometheus.NewParser()
	client := newClient(settings, telemetryStore, config)

	return &provider{
		settings: settings,
		engine:   engine,
		parser:   parser,
		client:   client,
	}, nil
}

func (p *provider) Engine() *prometheus.Engine {
	return p.engine
}

func (p *provider) Parser() prometheus.Parser {
	return p.parser
}

func (p *provider) Storage() storage.Queryable {
	return p
}

func (p *provider) Querier(mint, maxt int64) (storage.Querier, error) {
	return &querier{mint: mint, maxt: maxt, client: p.client}, nil
}

// CapturingStorage implements prometheus.StatementCapturer: a storage that
// records each selector's SQL without executing it, for the preview path.
// A fresh recorder per call keeps concurrent dry-runs isolated.
func (p *provider) CapturingStorage() (storage.Queryable, prometheus.StatementRecorder) {
	recorder := &statementRecorder{}
	return &captureQueryable{client: p.client, recorder: recorder}, recorder
}
