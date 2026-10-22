package clickhouseprometheusv2

import (
	"context"
	"encoding/json"
	"log/slog"
	"math"
	"slices"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/prometheus/prometheus/model/labels"
	promValue "github.com/prometheus/prometheus/model/value"
)

// seriesLookup holds a series lookup's result: matched fingerprints with
// their labels, and the distinct metric names seen on them.
type seriesLookup struct {
	fingerprints map[uint64]labels.Labels
	metricNames  []string
}

// client executes the series, samples and raw queries against ClickHouse.
type client struct {
	settings       factory.ScopedProviderSettings
	telemetryStore telemetrystore.TelemetryStore
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

// unmarshalLabels parses the labels JSON column, dropping empty-valued
// labels: empty means "absent" in Prometheus, but stored attribute JSON can
// carry them.
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

// selectSamples assembles per-series sample slices from a samples query (raw
// or last-sample-per-step; same column shape), whose rows arrive ordered by
// (fingerprint, unix_milli). Fingerprints missing from the lookup are skipped:
// the samples query's semi-join re-runs the series predicates and can match
// series registered after the lookup ran — the lookup is the read snapshot.
// Stale flags map to the engine's StaleNaN. Duplicate
// timestamps pass through: uniqueness is ingest's job, and v1 feeds them to
// the engine as-is over the same dirty data.
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
		unknownCount int
	)

	for rows.Next() {
		if err := rows.Scan(&fingerprint, &timestampMs, &val, &flags); err != nil {
			return nil, err
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
