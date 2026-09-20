package ingest

import (
	"fmt"
	"strconv"
	"strings"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/pmetric"
)

type metricPoint struct {
	timestamp   pcommon.Timestamp
	start       pcommon.Timestamp
	attributes  pcommon.Map
	value       any
	count       any
	sum         any
	min         any
	max         any
	temporality string
	monotonic   bool
	flags       uint32
	data        map[string]any
}

const metricInsertColumns = `(
 org_id, space_id, sample_id, metric_name, metric_type, description, unit,
 timestamp, timestamp_unix_nano, start_time_unix_nano, value, count_value,
 sum_value, min_value, max_value, aggregation_temporality, is_monotonic, flags,
 point_data, payload, service_name, resource_schema_url, scope_schema_url,
 scope_name, scope_version, scope_attributes, resource_attributes, attributes,
 run_id, session_id, user_id, agent_product, agent_name
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`

const metricUpsert = ` ON DUPLICATE KEY UPDATE
 metric_name=VALUES(metric_name), metric_type=VALUES(metric_type), description=VALUES(description), unit=VALUES(unit),
 timestamp=VALUES(timestamp), timestamp_unix_nano=VALUES(timestamp_unix_nano), start_time_unix_nano=VALUES(start_time_unix_nano),
 value=VALUES(value), count_value=VALUES(count_value), sum_value=VALUES(sum_value), min_value=VALUES(min_value),
 max_value=VALUES(max_value), aggregation_temporality=VALUES(aggregation_temporality), is_monotonic=VALUES(is_monotonic),
 flags=VALUES(flags), point_data=VALUES(point_data), payload=VALUES(payload), service_name=VALUES(service_name),
 resource_schema_url=VALUES(resource_schema_url), scope_schema_url=VALUES(scope_schema_url), scope_name=VALUES(scope_name),
 scope_version=VALUES(scope_version), scope_attributes=VALUES(scope_attributes), resource_attributes=VALUES(resource_attributes),
 attributes=VALUES(attributes), space_id=VALUES(space_id), run_id=VALUES(run_id), session_id=VALUES(session_id), user_id=VALUES(user_id),
 agent_product=VALUES(agent_product), agent_name=VALUES(agent_name)`

func numberValue(dp pmetric.NumberDataPoint) any {
	switch dp.ValueType() {
	case pmetric.NumberDataPointValueTypeInt:
		return dp.IntValue()
	case pmetric.NumberDataPointValueTypeDouble:
		return finiteFloat(dp.DoubleValue())
	default:
		return nil
	}
}

func numberValueForJSON(dp pmetric.NumberDataPoint) any {
	switch dp.ValueType() {
	case pmetric.NumberDataPointValueTypeInt:
		return dp.IntValue()
	case pmetric.NumberDataPointValueTypeDouble:
		return normalizeJSON(dp.DoubleValue())
	default:
		return nil
	}
}

func exemplarsJSON(exemplars pmetric.ExemplarSlice) []map[string]any {
	result := make([]map[string]any, 0, exemplars.Len())
	for i := 0; i < exemplars.Len(); i++ {
		exemplar := exemplars.At(i)
		var value any
		switch exemplar.ValueType() {
		case pmetric.ExemplarValueTypeInt:
			value = exemplar.IntValue()
		case pmetric.ExemplarValueTypeDouble:
			value = normalizeJSON(exemplar.DoubleValue())
		}
		result = append(result, map[string]any{
			"timestamp_unix_nano": uint64(exemplar.Timestamp()),
			"value":               value,
			"trace_id":            traceIDString(exemplar.TraceID()),
			"span_id":             spanIDString(exemplar.SpanID()),
			"filtered_attributes": exemplar.FilteredAttributes().AsRaw(),
		})
	}
	return result
}

func numberPoints(points pmetric.NumberDataPointSlice, temporality pmetric.AggregationTemporality, monotonic bool) []metricPoint {
	result := make([]metricPoint, 0, points.Len())
	for i := 0; i < points.Len(); i++ {
		dp := points.At(i)
		result = append(result, metricPoint{
			timestamp:   dp.Timestamp(),
			start:       dp.StartTimestamp(),
			attributes:  dp.Attributes(),
			value:       numberValue(dp),
			temporality: temporality.String(),
			monotonic:   monotonic,
			flags:       uint32(dp.Flags()),
			data: map[string]any{
				"value":      numberValueForJSON(dp),
				"value_type": dp.ValueType().String(),
				"exemplars":  exemplarsJSON(dp.Exemplars()),
			},
		})
	}
	return result
}

func histogramPoints(metric pmetric.Metric) []metricPoint {
	histogram := metric.Histogram()
	points := histogram.DataPoints()
	result := make([]metricPoint, 0, points.Len())
	for i := 0; i < points.Len(); i++ {
		dp := points.At(i)
		var sum, min, max any
		if dp.HasSum() {
			sum = finiteFloat(dp.Sum())
		}
		if dp.HasMin() {
			min = finiteFloat(dp.Min())
		}
		if dp.HasMax() {
			max = finiteFloat(dp.Max())
		}
		value := sum
		if value == nil {
			value = float64(dp.Count())
		}
		result = append(result, metricPoint{
			timestamp:   dp.Timestamp(),
			start:       dp.StartTimestamp(),
			attributes:  dp.Attributes(),
			value:       value,
			count:       strconv.FormatUint(dp.Count(), 10),
			sum:         sum,
			min:         min,
			max:         max,
			temporality: histogram.AggregationTemporality().String(),
			monotonic:   true,
			flags:       uint32(dp.Flags()),
			data: map[string]any{
				"count":           dp.Count(),
				"sum":             normalizeJSON(dp.Sum()),
				"has_sum":         dp.HasSum(),
				"min":             normalizeJSON(dp.Min()),
				"has_min":         dp.HasMin(),
				"max":             normalizeJSON(dp.Max()),
				"has_max":         dp.HasMax(),
				"explicit_bounds": dp.ExplicitBounds().AsRaw(),
				"bucket_counts":   dp.BucketCounts().AsRaw(),
				"exemplars":       exemplarsJSON(dp.Exemplars()),
			},
		})
	}
	return result
}

func exponentialHistogramPoints(metric pmetric.Metric) []metricPoint {
	histogram := metric.ExponentialHistogram()
	points := histogram.DataPoints()
	result := make([]metricPoint, 0, points.Len())
	for i := 0; i < points.Len(); i++ {
		dp := points.At(i)
		var sum, min, max any
		if dp.HasSum() {
			sum = finiteFloat(dp.Sum())
		}
		if dp.HasMin() {
			min = finiteFloat(dp.Min())
		}
		if dp.HasMax() {
			max = finiteFloat(dp.Max())
		}
		value := sum
		if value == nil {
			value = float64(dp.Count())
		}
		result = append(result, metricPoint{
			timestamp:   dp.Timestamp(),
			start:       dp.StartTimestamp(),
			attributes:  dp.Attributes(),
			value:       value,
			count:       strconv.FormatUint(dp.Count(), 10),
			sum:         sum,
			min:         min,
			max:         max,
			temporality: histogram.AggregationTemporality().String(),
			monotonic:   true,
			flags:       uint32(dp.Flags()),
			data: map[string]any{
				"count":          dp.Count(),
				"sum":            normalizeJSON(dp.Sum()),
				"has_sum":        dp.HasSum(),
				"min":            normalizeJSON(dp.Min()),
				"has_min":        dp.HasMin(),
				"max":            normalizeJSON(dp.Max()),
				"has_max":        dp.HasMax(),
				"scale":          dp.Scale(),
				"zero_count":     dp.ZeroCount(),
				"zero_threshold": normalizeJSON(dp.ZeroThreshold()),
				"positive": map[string]any{
					"offset": dp.Positive().Offset(), "bucket_counts": dp.Positive().BucketCounts().AsRaw(),
				},
				"negative": map[string]any{
					"offset": dp.Negative().Offset(), "bucket_counts": dp.Negative().BucketCounts().AsRaw(),
				},
				"exemplars": exemplarsJSON(dp.Exemplars()),
			},
		})
	}
	return result
}

func summaryPoints(metric pmetric.Metric) []metricPoint {
	points := metric.Summary().DataPoints()
	result := make([]metricPoint, 0, points.Len())
	for i := 0; i < points.Len(); i++ {
		dp := points.At(i)
		quantiles := make([]map[string]any, 0, dp.QuantileValues().Len())
		for qIndex := 0; qIndex < dp.QuantileValues().Len(); qIndex++ {
			quantile := dp.QuantileValues().At(qIndex)
			quantiles = append(quantiles, map[string]any{
				"quantile": quantile.Quantile(), "value": normalizeJSON(quantile.Value()),
			})
		}
		result = append(result, metricPoint{
			timestamp:   dp.Timestamp(),
			start:       dp.StartTimestamp(),
			attributes:  dp.Attributes(),
			value:       finiteFloat(dp.Sum()),
			count:       strconv.FormatUint(dp.Count(), 10),
			sum:         finiteFloat(dp.Sum()),
			temporality: pmetric.AggregationTemporalityCumulative.String(),
			monotonic:   true,
			flags:       uint32(dp.Flags()),
			data: map[string]any{
				"count": dp.Count(), "sum": normalizeJSON(dp.Sum()), "quantile_values": quantiles,
			},
		})
	}
	return result
}

func pointsForMetric(metric pmetric.Metric) []metricPoint {
	switch metric.Type() {
	case pmetric.MetricTypeGauge:
		return numberPoints(metric.Gauge().DataPoints(), pmetric.AggregationTemporalityUnspecified, false)
	case pmetric.MetricTypeSum:
		return numberPoints(metric.Sum().DataPoints(), metric.Sum().AggregationTemporality(), metric.Sum().IsMonotonic())
	case pmetric.MetricTypeHistogram:
		return histogramPoints(metric)
	case pmetric.MetricTypeExponentialHistogram:
		return exponentialHistogramPoints(metric)
	case pmetric.MetricTypeSummary:
		return summaryPoints(metric)
	default:
		return nil
	}
}

// buildMetricRows maps an OTLP metric payload to flat signoz_metric_samples
// rows. Pure; the args order matches metricInsertColumns exactly (verbatim port
// of pushMetrics + writeMetricPoint, including the point.data enrichment).
func buildMetricRows(metrics pmetric.Metrics, orgID string) ([][]any, error) {
	rows := make([][]any, 0, metrics.DataPointCount())
	resourceMetrics := metrics.ResourceMetrics()
	for resourceIndex := 0; resourceIndex < resourceMetrics.Len(); resourceIndex++ {
		rm := resourceMetrics.At(resourceIndex)
		resource := rm.Resource().Attributes()
		resourceJSON, err := jsonString(resource.AsRaw())
		if err != nil {
			return nil, fmt.Errorf("encode metric resource attributes: %w", err)
		}
		serviceName := attributeString(resource, "service.name")
		scopeMetrics := rm.ScopeMetrics()
		for scopeIndex := 0; scopeIndex < scopeMetrics.Len(); scopeIndex++ {
			sm := scopeMetrics.At(scopeIndex)
			scope := sm.Scope()
			scopeJSON, err := jsonString(scope.Attributes().AsRaw())
			if err != nil {
				return nil, fmt.Errorf("encode metric scope attributes: %w", err)
			}
			metricSlice := sm.Metrics()
			for metricIndex := 0; metricIndex < metricSlice.Len(); metricIndex++ {
				metric := metricSlice.At(metricIndex)
				for _, point := range pointsForMetric(metric) {
					row, err := buildMetricRow(rm, sm, metric, point, resource, resourceJSON, scopeJSON, serviceName, orgID)
					if err != nil {
						return nil, err
					}
					rows = append(rows, row)
				}
			}
		}
	}
	return rows, nil
}

func buildMetricRow(
	rm pmetric.ResourceMetrics,
	sm pmetric.ScopeMetrics,
	metric pmetric.Metric,
	point metricPoint,
	resource pcommon.Map,
	resourceJSON, scopeJSON, serviceName, orgID string,
) ([]any, error) {
	attributesJSON, err := jsonString(point.attributes.AsRaw())
	if err != nil {
		return nil, fmt.Errorf("encode metric attributes: %w", err)
	}
	point.data["timestamp_unix_nano"] = uint64(point.timestamp)
	point.data["start_time_unix_nano"] = uint64(point.start)
	point.data["attributes"] = point.attributes.AsRaw()
	pointJSON, err := jsonString(point.data)
	if err != nil {
		return nil, fmt.Errorf("encode metric point: %w", err)
	}
	payloadJSON, err := jsonString(map[string]any{
		"metric_name": metric.Name(), "metric_type": strings.ToLower(metric.Type().String()),
		"description": metric.Description(), "unit": metric.Unit(), "point": point.data,
		"resource_attributes": resource.AsRaw(), "scope_attributes": sm.Scope().Attributes().AsRaw(),
	})
	if err != nil {
		return nil, fmt.Errorf("encode metric payload: %w", err)
	}
	correlation := extractCorrelation(resource, point.attributes, orgID)
	sampleID := digest(
		metric.Name(), strings.ToLower(metric.Type().String()), timestampArg(point.timestamp), timestampArg(point.start),
		resourceJSON, scopeJSON, attributesJSON, pointJSON,
	)
	return []any{
		correlation.orgID, correlation.spaceID, sampleID, truncate(metric.Name(), 512), strings.ToLower(metric.Type().String()), metric.Description(), truncate(metric.Unit(), 128),
		timestampArg(point.timestamp), timestampArg(point.timestamp), timestampArg(point.start), point.value, point.count,
		point.sum, point.min, point.max, point.temporality, point.monotonic, point.flags,
		pointJSON, payloadJSON, serviceName, truncate(rm.SchemaUrl(), 512), truncate(sm.SchemaUrl(), 512),
		truncate(sm.Scope().Name(), 255), truncate(sm.Scope().Version(), 255), scopeJSON, resourceJSON, attributesJSON,
		correlation.runID, correlation.sessionID, correlation.userID, correlation.product, correlation.agentName,
	}, nil
}
