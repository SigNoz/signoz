package clickhousemetricsexporter

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz-otel-collector/usage"
	"github.com/google/uuid"
	"go.opencensus.io/metric/metricdata"
	"go.opencensus.io/stats"
	"go.opencensus.io/stats/view"
	"go.opencensus.io/tag"
)

const (
	SigNozSentMetricPointsKey      = "singoz_sent_metric_points"
	SigNozSentMetricPointsBytesKey = "singoz_sent_metric_points_bytes"
	SigNozMetricPointsCount        = "signoz_metric_points_count"
	SigNozMetricPointsBytes        = "signoz_metric_points_bytes"
)

var (
	// Measures for usage
	ExporterSigNozSentMetricPoints = stats.Int64(
		SigNozSentMetricPointsKey,
		"Number of signoz metric points successfully sent to destination.",
		stats.UnitDimensionless)
	ExporterSigNozSentMetricPointsBytes = stats.Int64(
		SigNozSentMetricPointsBytesKey,
		"Total size of signoz metric points successfully sent to destination.",
		stats.UnitDimensionless)

	// Views for usage
	MetricPointsCountView = &view.View{
		Name:        SigNozMetricPointsCount,
		Measure:     ExporterSigNozSentMetricPoints,
		Description: "The number of metric points exported to signoz",
		Aggregation: view.Sum(),
		TagKeys:     []tag.Key{usage.TagTenantKey, usage.TagExporterIdKey},
	}
	MetricPointsBytesView = &view.View{
		Name:        SigNozMetricPointsBytes,
		Measure:     ExporterSigNozSentMetricPointsBytes,
		Description: "The size of metric points exported to signoz",
		Aggregation: view.Sum(),
		TagKeys:     []tag.Key{usage.TagTenantKey, usage.TagExporterIdKey},
	}
)

func UsageExporter(metrics []*metricdata.Metric, id uuid.UUID) (map[string]usage.Usage, error) {
	data := map[string]usage.Usage{}
	for _, metric := range metrics {
		if !strings.Contains(metric.Descriptor.Name, SigNozMetricPointsCount) && !strings.Contains(metric.Descriptor.Name, SigNozMetricPointsBytes) {
			continue
		}
		exporterIndex := usage.GetIndexOfLabel(metric.Descriptor.LabelKeys, usage.ExporterIDKey)
		tenantIndex := usage.GetIndexOfLabel(metric.Descriptor.LabelKeys, usage.TenantKey)
		if exporterIndex == -1 || tenantIndex == -1 {
			return nil, fmt.Errorf("usage: failed to get index of labels")
		}
		if strings.Contains(metric.Descriptor.Name, SigNozMetricPointsCount) {
			for _, v := range metric.TimeSeries {
				if v.LabelValues[exporterIndex].Value != id.String() {
					continue
				}
				tenant := v.LabelValues[tenantIndex].Value
				if d, ok := data[tenant]; ok {
					d.Count = v.Points[0].Value.(int64)
					data[tenant] = d
				} else {
					data[tenant] = usage.Usage{
						Count: v.Points[0].Value.(int64),
					}
				}
			}
		} else if strings.Contains(metric.Descriptor.Name, SigNozMetricPointsBytes) {
			for _, v := range metric.TimeSeries {
				if v.LabelValues[exporterIndex].Value != id.String() {
					continue
				}
				tenant := v.LabelValues[tenantIndex].Value
				if d, ok := data[tenant]; ok {
					d.Size = v.Points[0].Value.(int64)
					data[tenant] = d
				} else {
					data[tenant] = usage.Usage{
						Size: v.Points[0].Value.(int64),
					}
				}
			}
		}
	}
	return data, nil
}
