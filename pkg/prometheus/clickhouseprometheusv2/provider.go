package clickhouseprometheusv2

import (
	"context"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/prometheus/prometheus/model/labels"
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

func (p *provider) LabelNames(ctx context.Context, matcherSets [][]*labels.Matcher, start, end time.Time, limit int) ([]string, error) {
	return p.mergedLabelQuery(ctx, matcherSets, start, end, limit, func(q storage.Querier, matchers []*labels.Matcher) ([]string, error) {
		names, _, err := q.LabelNames(ctx, nil, matchers...)
		return names, err
	})
}

func (p *provider) LabelValues(ctx context.Context, name string, matcherSets [][]*labels.Matcher, start, end time.Time, limit int) ([]string, error) {
	return p.mergedLabelQuery(ctx, matcherSets, start, end, limit, func(q storage.Querier, matchers []*labels.Matcher) ([]string, error) {
		values, _, err := q.LabelValues(ctx, name, nil, matchers...)
		return values, err
	})
}

// mergedLabelQuery runs fetch once per matcher set (AND-matched) and returns
// the sorted, deduplicated union (OR-matched), capped to limit. No Limit
// hint reaches fetch: the underlying LabelNames/LabelValues queries apply it
// as a bare SQL LIMIT with no ORDER BY, which would pick an arbitrary, not
// the smallest, subset — this is the only place allowed to truncate.
func (p *provider) mergedLabelQuery(ctx context.Context, matcherSets [][]*labels.Matcher, start, end time.Time, limit int, fetch func(storage.Querier, []*labels.Matcher) ([]string, error)) ([]string, error) {
	q, err := p.Querier(start.UnixMilli(), end.UnixMilli())
	if err != nil {
		return nil, err
	}
	defer q.Close()

	if len(matcherSets) == 0 {
		matcherSets = [][]*labels.Matcher{nil}
	}

	merged := make(map[string]struct{})
	for _, matchers := range matcherSets {
		values, err := fetch(q, matchers)
		if err != nil {
			return nil, err
		}
		for _, value := range values {
			merged[value] = struct{}{}
		}
	}
	return sortedLimitedKeys(merged, limit), nil
}

func (p *provider) Series(ctx context.Context, matcherSets [][]*labels.Matcher, start, end time.Time, limit int) ([]labels.Labels, error) {
	q, err := p.Querier(start.UnixMilli(), end.UnixMilli())
	if err != nil {
		return nil, err
	}
	defer q.Close()

	hints := &storage.SelectHints{Start: start.UnixMilli(), End: end.UnixMilli(), Func: "series"}
	merged := make(map[string]labels.Labels)
	for _, matchers := range matcherSets {
		ss := q.Select(ctx, false, hints, matchers...)
		for ss.Next() {
			lset := ss.At().Labels()
			merged[lset.String()] = lset
		}
		if err := ss.Err(); err != nil {
			return nil, err
		}
	}

	keys := sortedLimitedKeys(merged, limit)
	out := make([]labels.Labels, len(keys))
	for i, key := range keys {
		out[i] = merged[key]
	}
	return out, nil
}

// sortedLimitedKeys returns m's keys sorted ascending, capped to limit (0 means unlimited).
func sortedLimitedKeys[V any](m map[string]V, limit int) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	slices.Sort(keys)
	if limit > 0 && len(keys) > limit {
		keys = keys[:limit]
	}
	return keys
}
