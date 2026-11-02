package telemetrymetadata

import (
	"context"
	"log/slog"

	"github.com/huandu/go-sqlbuilder"

	"github.com/SigNoz/signoz/pkg/clickhousesql"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// getMeterKeys returns the keys from the meter metrics that match the field selection criteria.
func (t *telemetryMetaStore) getMeterSourceMetricKeys(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getMeterSourceMetricKeys",
	})

	if len(fieldKeySelectors) == 0 {
		return nil, true, nil
	}

	sb := sqlbuilder.Select("DISTINCT arrayJoin(JSONExtractKeys(labels)) as attr_name").From(t.meterDBName + "." + t.meterFieldsTblName)
	conds := []string{}
	var limit int
	for _, fieldKeySelector := range fieldKeySelectors {
		fieldConds := []string{}
		if fieldKeySelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			fieldConds = append(fieldConds, sb.E("attr_name", fieldKeySelector.Name))
		} else {
			fieldConds = append(fieldConds, sb.Like("attr_name", "%"+fieldKeySelector.Name+"%"))
		}
		fieldConds = append(fieldConds, sb.NotLike("attr_name", "\\_\\_%"))

		if fieldKeySelector.MetricContext != nil {
			if fieldKeySelector.MetricContext.MetricName != "" {
				fieldConds = append(fieldConds, sb.E("metric_name", fieldKeySelector.MetricContext.MetricName))
			}
			if fieldKeySelector.MetricContext.MetricNamespace != "" {
				fieldConds = append(fieldConds, sb.Like("metric_name", clickhousesql.LikePattern(fieldKeySelector.MetricContext.MetricNamespace)+"%"))
			}
		}

		conds = append(conds, sb.And(fieldConds...))
		limit += fieldKeySelector.Limit
	}
	sb.Where(sb.Or(conds...))
	if limit == 0 {
		limit = 1000
	}

	sb.Limit(limit)
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMeterKeys.Error())
	}
	defer rows.Close()

	keys := []*telemetrytypes.TelemetryFieldKey{}
	rowCount := 0
	for rows.Next() {
		rowCount++
		// reached the limit, we know there are more results
		if rowCount > limit {
			break
		}

		var name string
		err = rows.Scan(&name)
		if err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMeterKeys.Error())
		}
		// meter labels are stored as strings in the labels JSON and have no
		// attribute context, so only the data type is known
		keys = append(keys, &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalMetrics,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		})
	}

	if rows.Err() != nil {
		return nil, false, errors.Wrap(rows.Err(), errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMeterKeys.Error())
	}

	// hit the limit?
	complete := rowCount <= limit

	return keys, complete, nil

}

func (t *telemetryMetaStore) getMeterSourceMetricFieldValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getMeterSourceMetricFieldValues",
	})
	sb := sqlbuilder.Select("DISTINCT arrayJoin(JSONExtractKeysAndValues(labels, 'String')) AS attr").
		From(t.meterDBName + "." + t.meterFieldsTblName)

	if fieldValueSelector.Name != "" {
		sb.Where(sb.E("attr.1", fieldValueSelector.Name))
	}
	sb.Where(sb.NotLike("attr.1", "\\_\\_%"))

	if fieldValueSelector.MetricContext != nil && fieldValueSelector.MetricContext.MetricName != "" {
		sb.Where(sb.E("metric_name", fieldValueSelector.MetricContext.MetricName))
	}
	if fieldValueSelector.MetricContext != nil && fieldValueSelector.MetricContext.MetricNamespace != "" {
		sb.Where(sb.Like("metric_name", clickhousesql.LikePattern(fieldValueSelector.MetricContext.MetricNamespace)+"%"))
	}

	if fieldValueSelector.Value != "" {
		if fieldValueSelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			sb.Where(sb.E("attr.2", fieldValueSelector.Value))
		} else {
			sb.Where(sb.Like("attr.2", "%"+fieldValueSelector.Value+"%"))
		}
	}
	sb.Where(sb.NE("attr.2", ""))

	limit := fieldValueSelector.Limit
	if limit == 0 {
		limit = 50
	}
	// query one extra to check if we hit the limit
	sb.Limit(limit + 1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMeterValues.Error())
	}
	defer rows.Close()

	values := &telemetrytypes.TelemetryFieldValues{}
	rowCount := 0
	for rows.Next() {
		rowCount++
		// reached the limit, we know there are more results
		if rowCount > limit {
			break
		}

		var attribute []string
		if err := rows.Scan(&attribute); err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetMeterValues.Error())
		}
		if len(attribute) > 1 {
			values.StringValues = append(values.StringValues, attribute[1])
		}
	}

	// hit the limit?
	complete := rowCount <= limit
	return values, complete, nil
}

func (t *telemetryMetaStore) fetchMeterSourceMetricsTemporalityAndType(ctx context.Context, metricNames ...string) (map[string]metrictypes.Temporality, map[string]metrictypes.Type, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "fetchMeterSourceMetricsTemporalityAndType",
	})
	temporalities := make(map[string]metrictypes.Temporality)
	types := make(map[string]metrictypes.Type)

	sb := sqlbuilder.Select(
		"metric_name",
		"argMax(temporality, unix_milli) as temporality",
		"any(type) AS type",
		"argMax(is_monotonic, unix_milli) as is_monotonic",
	).From(t.meterDBName + "." + t.meterFieldsTblName)

	// Filter by metric names (in the temporality column due to data mix-up)
	sb.Where(sb.In("metric_name", metricNames))

	// Group by metric name to get one temporality per metric
	sb.GroupBy("metric_name")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	t.logger.DebugContext(ctx, "fetching meter metrics temporality", slog.String("query", query), slog.Any("args", args))

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to fetch meter metric temporality")
	}
	defer rows.Close()

	// Process results
	for rows.Next() {
		var metricName string
		var temporality metrictypes.Temporality
		var metricType metrictypes.Type
		var isMonotonic bool
		if err := rows.Scan(&metricName, &temporality, &metricType, &isMonotonic); err != nil {
			return nil, nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to scan temporality result")
		}
		metricType = resolveMetricType(metricType, isMonotonic, temporality)
		temporalities[metricName] = temporality
		types[metricName] = metricType
	}

	return temporalities, types, nil
}
