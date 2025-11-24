package implmetricsmodule

// default filter condition, this will be returned when no error and no where clause to process
// so that an error state can be distinctly identified with empty condition.
const defaultFilterConditionTrue = "true"

const (
	sqlKeyWordWhere     = "WHERE"
	sqlColumnTimeSeries = "timeseries"
	sqlColumnSamples    = "samples"
)
