package implmetricsmodule

import (
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
)

// default filter condition, this will be returned when no error and no where clause to process
// so that an error state can be distinctly identified with empty condition.
const defaultFilterConditionTrue = "true"

const (
	sqlKeyWordWhere = "WHERE"
)

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
