package clickhouseprometheusv2

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/prometheus/prometheus/model/labels"
	promValue "github.com/prometheus/prometheus/model/value"
)

// seriesLookup is a series-lookup result: matched fingerprints with their
// labels, and the distinct metric names seen on them.
type seriesLookup struct {
	fingerprints map[uint64]labels.Labels
	metricNames  []string
}

// client executes the series, samples and raw queries against ClickHouse.
type client struct {
	settings       factory.ScopedProviderSettings
	telemetryStore telemetrystore.TelemetryStore
	cfg            prometheus.ClickhouseV2Config
	lookbackMs     int64
}

func newClient(settings factory.ScopedProviderSettings, telemetryStore telemetrystore.TelemetryStore, cfg prometheus.Config) *client {
	lookback := cfg.LookbackDelta
	if lookback <= 0 {
		// Mirror the engine: promql defaults an unset lookback to 5m.
		lookback = defaultLookbackDelta
	}
	return &client{
		settings:       settings,
		telemetryStore: telemetryStore,
		cfg:            cfg.ClickhouseV2,
		lookbackMs:     lookback.Milliseconds(),
	}
}

func (c *client) withContext(ctx context.Context, functionName string) context.Context {
	return ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.CodeNamespace:    "clickhouse-prometheus-v2",
		instrumentationtypes.CodeFunctionName: functionName,
	})
}

// selectSeries runs the series lookup for the given matchers and window.
func (c *client) selectSeries(ctx context.Context, query string, args []any) (*seriesLookup, error) {
	ctx = c.withContext(ctx, "selectSeries")
	rows, err := c.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lookup := &seriesLookup{fingerprints: make(map[uint64]labels.Labels)}
	names := make(map[string]struct{})

	var fingerprint uint64
	var labelsJSON string
	for rows.Next() {
		if err := rows.Scan(&fingerprint, &labelsJSON); err != nil {
			return nil, err
		}
		lset, err := unmarshalLabels(labelsJSON)
		if err != nil {
			return nil, err
		}
		lookup.fingerprints[fingerprint] = lset
		if name := lset.Get(metricNameLabel); name != "" {
			names[name] = struct{}{}
		}
		if c.cfg.MaxFetchedSeries > 0 && len(lookup.fingerprints) > c.cfg.MaxFetchedSeries {
			return nil, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"promql selector matched more than %d series; narrow the label matchers or raise prometheus::clickhousev2::max_fetched_series",
				c.cfg.MaxFetchedSeries,
			)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for name := range names {
		lookup.metricNames = append(lookup.metricNames, name)
	}
	slices.Sort(lookup.metricNames)

	return lookup, nil
}

// unmarshalLabels parses the labels JSON column. Unlike v1, the fingerprint
// is not injected as a synthetic label (it would take part in `without (...)`
// grouping and vector matching) and empty-valued labels are dropped: an empty
// label value means "label absent" in Prometheus, and upstream never produces
// such labels, but stored attribute JSON can carry them.
func unmarshalLabels(s string) (labels.Labels, error) {
	m := make(map[string]string)
	if err := json.Unmarshal([]byte(s), &m); err != nil {
		return labels.EmptyLabels(), err
	}
	builder := labels.NewScratchBuilder(len(m))
	for k, v := range m {
		if v == "" {
			continue
		}
		builder.Add(k, v)
	}
	builder.Sort()
	return builder.Labels(), nil
}

// selectSamples executes a samples query (raw or last-sample-per-step; both
// produce the same column shape) and assembles the per-series sample slices.
// Rows arrive ordered by (fingerprint, unix_milli). Rows whose fingerprint
// is missing from the lookup are skipped (possible in the subquery filter
// mode, where the fingerprint filter re-runs after the lookup and can see
// series born in between). Stale flags map to the engine's StaleNaN.
// Duplicate timestamps pass through as stored: upstream Prometheus cannot
// produce them (its TSDB rejects them at ingest), our ingest can under
// at-least-once retries, and v1 feeds them to the engine as-is —
// deduplicating here would make this provider silently disagree with both
// v1 and the transpiled statements over the same dirty data. Uniqueness
// belongs to the ingest layer.
func (c *client) selectSamples(ctx context.Context, query string, args []any, lookup *seriesLookup) ([]*series, error) {
	ctx = c.withContext(ctx, "selectSamples")
	rows, err := c.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var (
		result       []*series
		current      *series
		fingerprint  uint64
		prevFp       uint64
		timestampMs  int64
		val          float64
		flags        uint32
		first        = true
		haveCurrent  bool
		staleMarker  = math.Float64frombits(promValue.StaleNaN)
		maxSamples   = c.cfg.MaxFetchedSamples
		fetched      int64
		unknownCount int
	)

	for rows.Next() {
		if err := rows.Scan(&fingerprint, &timestampMs, &val, &flags); err != nil {
			return nil, err
		}

		fetched++
		if maxSamples > 0 && fetched > maxSamples {
			return nil, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"promql query would fetch more than %d samples; narrow the selector or time range, or raise prometheus::clickhousev2::max_fetched_samples",
				maxSamples,
			)
		}

		if first || fingerprint != prevFp {
			first = false
			prevFp = fingerprint
			lset, ok := lookup.fingerprints[fingerprint]
			if !ok {
				unknownCount++
				haveCurrent = false
				continue
			}
			current = &series{lset: lset}
			result = append(result, current)
			haveCurrent = true
		}
		if !haveCurrent {
			// Remaining rows of a fingerprint missing from the lookup.
			continue
		}

		if flags&1 == 1 {
			val = staleMarker
		}
		current.ts = append(current.ts, timestampMs)
		current.vs = append(current.vs, val)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if unknownCount > 0 {
		c.settings.Logger().DebugContext(ctx, "skipped samples of fingerprints missing from series lookup",
			slog.Int("unknown_fingerprints", unknownCount))
	}

	return result, nil
}

// queryRaw supports the {job="rawsql", query="..."} escape hatch: the value of
// the query matcher runs as-is, each row becoming a single-sample series
// stamped at the query end. Column "value" is the sample value; every other
// column is a label.
func (c *client) queryRaw(ctx context.Context, query string, ts int64) ([]*series, error) {
	ctx = c.withContext(ctx, "queryRaw")
	rows, err := c.telemetryStore.ClickhouseDB().Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns := rows.Columns()
	targets := make([]any, len(columns))
	for i := range targets {
		targets[i] = new(scanner)
	}

	var result []*series
	for rows.Next() {
		if err := rows.Scan(targets...); err != nil {
			return nil, err
		}
		builder := labels.NewScratchBuilder(len(columns))
		var val float64
		for i, col := range columns {
			v := targets[i].(*scanner)
			if col == "value" {
				val = v.f
				continue
			}
			builder.Add(col, v.s)
		}
		builder.Sort()
		result = append(result, &series{
			lset: builder.Labels(),
			ts:   []int64{ts},
			vs:   []float64{val},
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

var _ sql.Scanner = (*scanner)(nil)

type scanner struct {
	f float64
	s string
}

func (s *scanner) Scan(val any) error {
	s.f = 0
	s.s = ""

	s.s = fmt.Sprintf("%v", val)
	switch val := val.(type) {
	case int64:
		s.f = float64(val)
	case uint64:
		s.f = float64(val)
	case float64:
		s.f = val
	case []byte:
		s.s = string(val)
	}
	return nil
}
