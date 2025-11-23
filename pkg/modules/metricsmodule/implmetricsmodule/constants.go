package implmetricsmodule

import (
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
)

// db and table name constants
const (
	metricDatabaseName                  = telemetrymetrics.DBName
	distributedUpdatedMetadataTableName = telemetrymetrics.UpdatedMetadataTableName
	updatedMetadataLocalTableName       = telemetrymetrics.UpdatedMetadataLocalTableName
	timeseriesV41dayTableName           = telemetrymetrics.TimeseriesV41dayTableName
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
