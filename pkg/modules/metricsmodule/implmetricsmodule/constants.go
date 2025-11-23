package implmetricsmodule

import "github.com/SigNoz/signoz/pkg/telemetrymetrics"

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
