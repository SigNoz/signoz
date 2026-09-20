// Package aivision implements AI Vision's domain projections inside SigNoz.
// It has no listener, database pool, tenant defaults or authentication provider.
// Requests are authorized by SigNoz; execution uses the main querier/store.
package aivision

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var errNotFound = errors.New("not found")

type config struct {
	Enabled       bool
	TablePrefix   string
	MaxLimit      int
	MaxQueryRange time.Duration
	QueryTimeout  time.Duration
}

type Module struct {
	store  *oceanBaseStore
	logger *slog.Logger
}

type oceanBaseStore struct {
	telemetryStore telemetrystore.TelemetryStore
	querier        querier.Querier
	cfg            config
}

func NewModule(settings factory.ProviderSettings, store telemetrystore.TelemetryStore, q querier.Querier, cfg telemetrystore.Config) *Module {
	return &Module{
		logger: settings.Logger,
		store: &oceanBaseStore{telemetryStore: store, querier: q, cfg: config{
			Enabled: cfg.Provider == "oceanbase", TablePrefix: cfg.OceanBase.TablePrefix,
			MaxLimit: cfg.OceanBase.MaxResultRows, MaxQueryRange: cfg.OceanBase.MaxQueryRange,
			QueryTimeout: cfg.OceanBase.QueryTimeout,
		}},
	}
}

func (store *oceanBaseStore) queryRows(ctx context.Context, sql string, args ...any) ([]map[string]any, error) {
	result, err := querier.ExecuteStatement(ctx, store.telemetryStore, &qbtypes.Statement{Query: sql, Args: args}, querier.StatementExecution{
		Name: "ai_vision", Kind: qbtypes.RequestTypeRaw, MaxRows: store.cfg.MaxLimit,
	})
	if err != nil {
		return nil, err
	}
	raw := result.Value.(*qbtypes.RawData)
	rows := make([]map[string]any, 0, len(raw.Rows))
	for _, row := range raw.Rows {
		for column, value := range row.Data {
			// These physical TEXT columns contain OTLP JSON. Their interpretation
			// is a domain concern; nullable/numeric/time scanning stays in querier.
			if typed, ok := value.(telemetrystoretypes.JSONValue); ok {
				row.Data[column] = map[string]any(typed)
				continue
			}
			if column == "attributes" || column == "resource_attributes" || column == "events" || column == "links" || column == "payload" || column == "body_json" {
				if text, ok := value.(string); ok {
					var decoded any
					if json.Unmarshal([]byte(text), &decoded) == nil {
						row.Data[column] = decoded
					}
				}
			}
		}
		rows = append(rows, row.Data)
	}
	return rows, nil
}

// Metrics must use the same metadata resolution, per-series time aggregation,
// space aggregation and caching as /api/v5/query_range, never AVG(raw_samples).
func (store *oceanBaseStore) metricDashboard(ctx context.Context, org string, req dashboardRequest) (dashboardResponse, error) {
	aggregation, err := dashboardAggregation(req.Params)
	if err != nil {
		return dashboardResponse{}, err
	}
	metric := dashboardStringParam(req.Params, "metric_name", "codex.requests")
	timeAgg := metrictypes.TimeAggregation{String: valuer.NewString(aggregation)}
	spaceAgg := metrictypes.SpaceAggregation{String: valuer.NewString(aggregation)}
	if aggregation == "count" {
		// Count samples within each series, then sum those counts. Counting
		// the intermediate rows would count series instead of samples.
		spaceAgg = metrictypes.SpaceAggregationSum
	}
	conditions := []string{}
	for _, field := range []struct{ key, value string }{{"space_id", req.SpaceID}, {"user_id", req.User}, {"agent_product", req.AgentProduct}} {
		if field.value != "" {
			quoted := strings.NewReplacer("\\", "\\\\", "'", "\\'").Replace(field.value)
			conditions = append(conditions, field.key+" = '"+quoted+"'")
		}
	}
	query := &qbtypes.QueryRangeRequest{
		Start: uint64(req.From), End: uint64(req.To), RequestType: qbtypes.RequestTypeTimeSeries,
		CompositeQuery: qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
			Name: "M", Signal: telemetrytypes.SignalMetrics, StepInterval: qbtypes.Step{Duration: time.Duration(dashboardStepMS(req.Params, req.To-req.From)) * time.Millisecond},
			Filter:       &qbtypes.Filter{Expression: strings.Join(conditions, " AND ")},
			Aggregations: []qbtypes.MetricAggregation{{MetricName: metric, TimeAggregation: timeAgg, SpaceAggregation: spaceAgg}},
		}}}},
	}
	orgID, err := valuer.NewUUID(org)
	if err != nil {
		return dashboardResponse{}, err
	}
	result, err := store.querier.QueryRange(ctx, orgID, query)
	if err != nil {
		return dashboardResponse{}, err
	}
	response := dashboardResponse{QueryKey: req.QueryKey, Columns: metricDashboardColumns(), Rows: []map[string]any{}, Meta: map[string]any{"metric_name": metric, "aggregation": aggregation}}
	for _, item := range result.Data.Results {
		series, ok := item.(*qbtypes.TimeSeriesData)
		if !ok {
			return dashboardResponse{}, fmt.Errorf("unexpected metric query result")
		}
		for _, agg := range series.Aggregations {
			for _, stream := range agg.Series {
				for _, point := range stream.Values {
					if !math.IsNaN(point.Value) && !math.IsInf(point.Value, 0) {
						response.Rows = append(response.Rows, map[string]any{"time": point.Timestamp, "value": point.Value})
					}
				}
			}
		}
	}
	return response, nil
}
