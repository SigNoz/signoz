package implmetricsmodule

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// helper struct just for the implementation way we chose
type orderConfig struct {
	sqlColumn      string
	direction      string
	orderBySamples bool
}

func resolveOrderBy(order *qbtypes.OrderBy) (orderConfig, error) {
	// default orderBy
	cfg := orderConfig{
		sqlColumn:      metrictypes.OrderByTimeSeries.StringValue(),
		direction:      strings.ToUpper(qbtypes.OrderDirectionDesc.StringValue()),
		orderBySamples: false,
	}

	if order == nil {
		return cfg, nil
	}

	// Extract column name from OrderByKey (which wraps TelemetryFieldKey)
	columnName := strings.ToLower(order.Key.Name)

	switch columnName {
	case metrictypes.OrderByTimeSeries.StringValue():
		cfg.sqlColumn = metrictypes.OrderByTimeSeries.StringValue()
	case metrictypes.OrderBySamples.StringValue():
		cfg.orderBySamples = true
		cfg.sqlColumn = metrictypes.OrderByTimeSeries.StringValue() // defer true ordering until samples computed
	default:
		return cfg, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order column %q", columnName)
	}

	// Extract direction from OrderDirection and convert to SQL format (uppercase)
	direction := strings.ToUpper(order.Direction.StringValue())
	// Validate direction using OrderDirectionMap
	if _, ok := qbtypes.OrderDirectionMap[strings.ToLower(direction)]; !ok {
		return cfg, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported order direction %q, should be one of %s, %s", direction, qbtypes.OrderDirectionAsc, qbtypes.OrderDirectionDesc)
	}
	cfg.direction = direction

	return cfg, nil
}

// generateMetricMetadataCacheKey generates a cache key for metric metadata
func generateMetricMetadataCacheKey(metricName string) string {
	return fmt.Sprintf("metrics_metadata:%s", metricName)
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
