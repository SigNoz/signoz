package oceanbasestatementbuilder

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	schema "github.com/SigNoz/signoz/pkg/telemetryschema/oceanbasetelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/huandu/go-sqlbuilder"
)

// Metrics retain the two-stage SigNoz semantics: first aggregate time within
// each OTLP series, then aggregate series in the requested group. This prevents
// avg across unevenly sampled series from turning into a sample-weighted avg.
func (b *Builder[T]) buildMetrics(_ context.Context, sb *sqlbuilder.SelectBuilder, stmt *qbtypes.Statement, _ qbtypes.RequestType, query qbtypes.QueryBuilderQuery[T], limit int) (*qbtypes.Statement, error) {
	if len(query.Aggregations) != 1 {
		return nil, telemetrystore.Unsupported("multiple metric aggregations per builder query")
	}
	agg, ok := any(query.Aggregations[0]).(qbtypes.MetricAggregation)
	if !ok || agg.MetricName == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName is required")
	}
	if agg.Reduced || agg.ValueFilter != nil || agg.ComparisonSpaceAggregationParam != nil {
		return nil, telemetrystore.Unsupported("advanced metric aggregation")
	}
	if agg.Type == metrictypes.HistogramType || agg.Type == metrictypes.ExpHistogramType || agg.Type == metrictypes.SummaryType {
		return nil, telemetrystore.Unsupported("histogram or summary queries")
	}
	step := query.StepInterval.Milliseconds()
	if step <= 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "stepInterval must be positive")
	}
	timeOp := agg.TimeAggregation.StringValue()
	if timeOp == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "metrics require an explicit timeAggregation")
	}
	spaceOp := strings.ToUpper(agg.SpaceAggregation.StringValue())
	switch spaceOp {
	case "SUM", "AVG", "MIN", "MAX", "COUNT":
	default:
		return nil, telemetrystore.Unsupported("metric space aggregation " + spaceOp)
	}
	var timeExpr string
	switch timeOp {
	case "sum", "avg", "min", "max", "count":
		timeExpr = strings.ToUpper(timeOp) + "(value)"
	case "latest":
		timeExpr = "MAX(CASE WHEN sample_rank = 1 THEN value END)"
	case "rate", "increase":
		if agg.Temporality != metrictypes.Delta {
			return nil, telemetrystore.Unsupported("cumulative counter rate/increase")
		}
		timeExpr = "SUM(value)"
		if timeOp == "rate" {
			timeExpr += fmt.Sprintf(" / %.9f", float64(step)/1000)
		}
	default:
		return nil, telemetrystore.Unsupported("metric time aggregation " + timeOp)
	}
	sb.Where(sb.E("metric_name", agg.MetricName))
	// Attribute serialization is canonical in the exporter. Include every
	// identity component (not timestamp, value or temporality) in the series key.
	seriesKey := "SHA2(CONCAT_WS(CHAR(0), resource_attributes, scope_name, scope_version, scope_attributes, attributes), 256)"
	bucket := fmt.Sprintf("(timestamp DIV %d) * %d", step*1000000, step)
	selects := []string{bucket + " AS bucket_ms", seriesKey + " AS series_key", "value"}
	var aliases []string
	for i, group := range query.GroupBy {
		field, err := schema.Field(query.Signal, group.TelemetryFieldKey)
		if err != nil {
			return nil, err
		}
		alias := schema.Alias(fmt.Sprintf("__GROUP_BY_KEY_%d_%s", i, group.Name))
		selects = append(selects, "CAST("+field+" AS CHAR) AS "+alias)
		aliases = append(aliases, alias)
	}
	if timeOp == "latest" {
		selects = append(selects, "ROW_NUMBER() OVER (PARTITION BY "+seriesKey+", "+bucket+" ORDER BY timestamp DESC, sample_id DESC) AS sample_rank")
	}
	sb.Select(selects...)
	baseSQL, args := sb.Build()
	groupTail := ""
	if len(aliases) != 0 {
		groupTail = ", " + strings.Join(aliases, ", ")
	}
	perSeries := "SELECT bucket_ms, series_key" + groupTail + ", " + timeExpr + " AS series_value FROM (" + baseSQL + ") samples GROUP BY bucket_ms, series_key" + groupTail
	// Scalar metric requests are reduced by the original querier postprocessor.
	stmt.Query = "SELECT CAST(TIMESTAMPADD(MICROSECOND, bucket_ms * 1000, CAST('1970-01-01 00:00:00' AS DATETIME(6))) AS DATETIME(6)) AS ts" + groupTail + ", " + spaceOp + "(series_value) AS __result_0 FROM (" + perSeries + ") series GROUP BY bucket_ms" + groupTail + " ORDER BY bucket_ms ASC LIMIT ?"
	// Read one sentinel row so the store rejects excessive results instead of
	// reducing a truncated series into a plausible but incorrect scalar.
	stmt.Args = append(args, b.config.MaxResultRows+1)
	return stmt, nil
}
