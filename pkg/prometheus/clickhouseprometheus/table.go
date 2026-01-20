package clickhouseprometheus

import "time"

const (
	databaseName                string = "signoz_metrics"
	distributedTimeSeriesV4     string = "distributed_time_series_v4"
	distributedTimeSeriesV46hrs string = "distributed_time_series_v4_6hrs"
	distributedTimeSeriesV41day string = "distributed_time_series_v4_1day"
	distributedSamplesV4        string = "distributed_samples_v4"
)

var (
	sixHoursInMilliseconds = time.Hour.Milliseconds() * 6
	oneDayInMilliseconds   = time.Hour.Milliseconds() * 24
)

// Returns the start time, end time and the table name to use for the query.
//
//	If time range is less than 6 hours, we need to use the `time_series_v4` table
//	else if time range is less than 1 day and greater than 6 hours, we need to use the `time_series_v4_6hrs` table
//	else we need to use the `time_series_v4_1day` table
func getStartAndEndAndTableName(start, end int64) (int64, int64, string) {
	var tableName string

	if end-start <= sixHoursInMilliseconds {
		// adjust the start time to nearest 1 hour
		start = start - (start % (time.Hour.Milliseconds() * 1))
		tableName = distributedTimeSeriesV4
	} else if end-start <= oneDayInMilliseconds {
		// adjust the start time to nearest 6 hours
		start = start - (start % (time.Hour.Milliseconds() * 6))
		tableName = distributedTimeSeriesV46hrs
	} else {
		// adjust the start time to nearest 1 day
		start = start - (start % (time.Hour.Milliseconds() * 24))
		tableName = distributedTimeSeriesV41day
	}

	return start, end, tableName
}
