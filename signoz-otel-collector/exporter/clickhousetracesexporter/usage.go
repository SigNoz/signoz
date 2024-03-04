package clickhousetracesexporter

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
	SigNozSentSpansKey      = "singoz_sent_spans"
	SigNozSentSpansBytesKey = "singoz_sent_spans_bytes"
	SigNozSpansCount        = "signoz_spans_count"
	SigNozSpansBytes        = "signoz_spans_bytes"
)

var (
	// Measures for usage
	ExporterSigNozSentSpans = stats.Int64(
		SigNozSentSpansKey,
		"Number of signoz log records successfully sent to destination.",
		stats.UnitDimensionless)
	ExporterSigNozSentSpansBytes = stats.Int64(
		SigNozSentSpansBytesKey,
		"Total size of signoz log records successfully sent to destination.",
		stats.UnitDimensionless)

	// Views for usage
	SpansCountView = &view.View{
		Name:        SigNozSpansCount,
		Measure:     ExporterSigNozSentSpans,
		Description: "The number of spans exported to signoz",
		Aggregation: view.Sum(),
		TagKeys:     []tag.Key{usage.TagTenantKey, usage.TagExporterIdKey},
	}
	SpansCountBytesView = &view.View{
		Name:        SigNozSpansBytes,
		Measure:     ExporterSigNozSentSpansBytes,
		Description: "The size of spans exported to signoz",
		Aggregation: view.Sum(),
		TagKeys:     []tag.Key{usage.TagTenantKey, usage.TagExporterIdKey},
	}
)

func UsageExporter(metrics []*metricdata.Metric, id uuid.UUID) (map[string]usage.Usage, error) {
	data := map[string]usage.Usage{}
	for _, metric := range metrics {
		if !strings.Contains(metric.Descriptor.Name, SigNozSpansCount) && !strings.Contains(metric.Descriptor.Name, SigNozSpansBytes) {
			continue
		}
		exporterIndex := usage.GetIndexOfLabel(metric.Descriptor.LabelKeys, usage.ExporterIDKey)
		tenantIndex := usage.GetIndexOfLabel(metric.Descriptor.LabelKeys, usage.TenantKey)
		if exporterIndex == -1 || tenantIndex == -1 {
			return nil, fmt.Errorf("usage: failed to get index of labels")
		}
		if strings.Contains(metric.Descriptor.Name, SigNozSpansCount) {
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
		} else if strings.Contains(metric.Descriptor.Name, SigNozSpansBytes) {
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
