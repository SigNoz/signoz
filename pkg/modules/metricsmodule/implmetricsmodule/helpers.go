package implmetricsmodule

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metricsmoduletypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

func generateMetricMetadataCacheKey(metricName string) string {
	return fmt.Sprintf("metrics_metadata:%s", metricName)
}

func resolveOrderBy(order *qbtypes.OrderBy) (string, string, error) {

	if order == nil {
		return sqlColumnTimeSeries, qbtypes.OrderDirectionDesc.StringValue(), nil
	}

	var columnName string
	switch strings.ToLower(order.Key.Name) {
	case metrictypes.OrderByTimeSeries.StringValue():
		columnName = sqlColumnTimeSeries
	case metrictypes.OrderBySamples.StringValue():
		columnName = sqlColumnSamples
	default:
		return "", "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order column %q", columnName)
	}

	// Extract direction from OrderDirection and convert to SQL format (uppercase)
	var direction qbtypes.OrderDirection
	var ok bool
	// Validate direction using OrderDirectionMap
	if direction, ok = qbtypes.OrderDirectionMap[strings.ToLower(order.Direction.StringValue())]; !ok {
		return "", "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order direction %q, should be one of %s, %s", direction, qbtypes.OrderDirectionAsc, qbtypes.OrderDirectionDesc)
	}

	return columnName, direction.StringValue(), nil
}

// TODO(nikhilmantri0902, srikanthccv): These constants need to be mapped to db constants like following.
// Is this the right way?
// convertMetricTypeToDBFormat converts metrictypes.Type (lowercase) to database format (capitalized)
func convertMetricTypeToDBFormat(metricType metrictypes.Type) string {
	switch metricType {
	case metrictypes.GaugeType:
		return "Gauge"
	case metrictypes.SumType:
		return "Sum"
	case metrictypes.HistogramType:
		return "Histogram"
	case metrictypes.SummaryType:
		return "Summary"
	case metrictypes.ExpHistogramType:
		return "ExponentialHistogram"
	default:
		return ""
	}
}

// convertTemporalityToDBFormat converts metrictypes.Temporality (lowercase) to database format (capitalized)
func convertTemporalityToDBFormat(temporality metrictypes.Temporality) string {
	switch temporality {
	case metrictypes.Delta:
		return "Delta"
	case metrictypes.Cumulative:
		return "Cumulative"
	case metrictypes.Unspecified:
		return "Unspecified"
	default:
		return ""
	}
}

// convertDBFormatToMetricType converts database format (capitalized) to metrictypes.Type (lowercase)
func convertDBFormatToMetricType(dbType string) metrictypes.Type {
	switch dbType {
	case "Gauge":
		return metrictypes.GaugeType
	case "Sum":
		return metrictypes.SumType
	case "Histogram":
		return metrictypes.HistogramType
	case "Summary":
		return metrictypes.SummaryType
	case "ExponentialHistogram":
		return metrictypes.ExpHistogramType
	default:
		return metrictypes.UnspecifiedType
	}
}

// convertDBFormatToTemporality converts database format (capitalized) to metrictypes.Temporality (lowercase)
func convertDBFormatToTemporality(dbTemporality string) metrictypes.Temporality {
	switch dbTemporality {
	case "Delta":
		return metrictypes.Delta
	case "Cumulative":
		return metrictypes.Cumulative
	case "Unspecified":
		return metrictypes.Unspecified
	default:
		return metrictypes.Unknown
	}
}

// enrichStatsWithMetadata enriches metric stats with metadata from the provided metadata map.
func enrichStatsWithMetadata(metricStats []metricsmoduletypes.Stat, metadata map[string]*metricsmoduletypes.MetricMetadata) {
	for i := range metricStats {
		if meta, ok := metadata[metricStats[i].MetricName]; ok {
			metricStats[i].Description = meta.Description
			metricStats[i].MetricType = meta.MetricType
			metricStats[i].MetricUnit = meta.MetricUnit
		}
	}
}
