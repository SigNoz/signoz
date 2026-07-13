package clickhouseprometheusv2

import "time"

const (
	// metricNameLabel is the reserved PromQL label holding the metric name.
	metricNameLabel string = "__name__"

	databaseName                 string = "signoz_metrics"
	distributedTimeSeriesV4      string = "distributed_time_series_v4"
	distributedTimeSeriesV46hrs  string = "distributed_time_series_v4_6hrs"
	distributedTimeSeriesV41day  string = "distributed_time_series_v4_1day"
	distributedTimeSeriesV41week string = "distributed_time_series_v4_1week"
	distributedSamplesV4         string = "distributed_samples_v4"

	localTimeSeriesV4      string = "time_series_v4"
	localTimeSeriesV46hrs  string = "time_series_v4_6hrs"
	localTimeSeriesV41day  string = "time_series_v4_1day"
	localTimeSeriesV41week string = "time_series_v4_1week"
)

// localTimeSeriesTable maps a distributed time series table to its shard-local
// table. Samples and time series shard on the same key
// (cityHash64(env, temporality, metric_name, fingerprint)), so a query whose
// top-level FROM is the distributed samples table can join or semi-join the
// local time series table inside each shard: the shard rewrite runs the
// subquery against the shard's own series rows, which are exactly the series
// of the shard's samples. No broadcast, no initiator-side join.
func localTimeSeriesTable(distributed string) string {
	switch distributed {
	case distributedTimeSeriesV46hrs:
		return localTimeSeriesV46hrs
	case distributedTimeSeriesV41day:
		return localTimeSeriesV41day
	case distributedTimeSeriesV41week:
		return localTimeSeriesV41week
	default:
		return localTimeSeriesV4
	}
}

var (
	oneHourInMilliseconds  = time.Hour.Milliseconds()
	sixHoursInMilliseconds = time.Hour.Milliseconds() * 6
	oneDayInMilliseconds   = time.Hour.Milliseconds() * 24
	oneWeekInMilliseconds  = time.Hour.Milliseconds() * 24 * 7
)

// timeSeriesTableFor returns the adjusted start and the time series table for
// the window. Time series tables hold one row per (fingerprint, bucket), with
// bucket granularities of 1h, 6h, 1d and 1w; the start is rounded down to the
// bucket boundary so a window beginning mid-bucket still matches the bucket's
// row.
func timeSeriesTableFor(start, end int64) (int64, string) {
	switch {
	case end-start < sixHoursInMilliseconds:
		return start - (start % oneHourInMilliseconds), distributedTimeSeriesV4
	case end-start < oneDayInMilliseconds:
		return start - (start % sixHoursInMilliseconds), distributedTimeSeriesV46hrs
	case end-start < oneWeekInMilliseconds:
		return start - (start % oneDayInMilliseconds), distributedTimeSeriesV41day
	default:
		return start - (start % oneWeekInMilliseconds), distributedTimeSeriesV41week
	}
}
