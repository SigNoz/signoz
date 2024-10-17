package inframetrics

import "strings"

// TODO(srikanthccv): remove this
// What is happening here?
// The `PrepareTimeseriesFilterQuery` uses the local time series table for sub-query because each fingerprint
// goes to same shard.
// However, in this case, we are interested in the attributes values across all the shards.
// So, we replace the local time series table with the distributed time series table.
// See `PrepareTimeseriesFilterQuery` for more details.
func localQueryToDistributedQuery(query string) string {
	return strings.Replace(query, ".time_series_v4", ".distributed_time_series_v4", 1)
}
