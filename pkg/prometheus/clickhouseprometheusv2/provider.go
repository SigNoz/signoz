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

type provider struct {
	settings factory.ScopedProviderSettings
	engine   *prometheus.Engine
	parser   prometheus.Parser
	client   *client
	executor *executor
}

var _ prometheus.Prometheus = (*provider)(nil)

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
		executor: &executor{client: client, engine: engine, parser: parser},
	}, nil
}

func (p *provider) QueryRange(ctx context.Context, query string, start, end time.Time, step time.Duration) (*prometheus.Result, error) {
	matrix, served, err := p.executor.TryExecuteRange(ctx, query, start, end, step)
	if err != nil {
		return nil, err
	}
	if served {
		return &prometheus.Result{Value: matrix}, nil
	}

	qry, err := p.engine.NewRangeQuery(p.traitsContext(ctx, query), p, nil, query, start, end, step)
	if err != nil {
		return nil, err
	}
	return finishQuery(ctx, qry)
}

func (p *provider) Query(ctx context.Context, query string, ts time.Time) (*prometheus.Result, error) {
	qry, err := p.engine.NewInstantQuery(p.traitsContext(ctx, query), p, nil, query, ts)
	if err != nil {
		return nil, err
	}
	return finishQuery(ctx, qry)
}

// A fresh recorder per call keeps concurrent dry-runs isolated. Exec drives
// a Select per selector (recording SQL) but reads no data.
func (p *provider) Statements(ctx context.Context, query string, start, end time.Time, step time.Duration) ([]prometheus.CapturedStatement, error) {
	recorder := &statementRecorder{}
	capture := &captureQueryable{client: p.client, recorder: recorder}
	qry, err := p.engine.NewRangeQuery(p.traitsContext(ctx, query), capture, nil, query, start, end, step)
	if err != nil {
		return nil, err
	}
	defer qry.Close()
	if res := qry.Exec(ctx); res.Err != nil {
		return nil, res.Err
	}
	return recorder.Statements(), nil
}

// traitsContext attaches the query's traits so the storage can prove
// step-aligned optimizations safe (see prometheus.QueryTraits). A parse
// failure surfaces from the engine with its own error.
func (p *provider) traitsContext(ctx context.Context, query string) context.Context {
	expr, err := p.parser.ParseExpr(query)
	if err != nil {
		return ctx
	}
	return prometheus.NewContextWithQueryTraits(ctx, prometheus.DetectQueryTraits(expr))
}

// finishQuery packages an engine evaluation. The query is closed only on
// error: Close returns the result's sample slices to the engine's pool, and
// the returned Value must stay valid for the caller.
func finishQuery(ctx context.Context, qry promql.Query) (*prometheus.Result, error) {
	res := qry.Exec(ctx)
	if res.Err != nil {
		qry.Close()
		return nil, res.Err
	}
	return &prometheus.Result{Value: res.Value, Warnings: res.Warnings, Stats: qry.Stats()}, nil
}

func (p *provider) Querier(mint, maxt int64) (storage.Querier, error) {
	return &querier{mint: mint, maxt: maxt, client: p.client}, nil
}
