package inframetrics

import (
	"strings"
	"time"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
)

// getParamsForTopItems returns the step, time series table name and samples table name
// for the top items query. what are we doing here?
// we want to identify the top hosts/pods/nodes quickly, so we use pre-aggregated data
// for samples and time series tables to speed up the query
// the speed of the query depends on the number of values in group by clause, the higher
// the step interval, the faster the query will be as number of rows to group by is reduced
// here we are using the averaged value of the time series data to get the top items
func getParamsForTopItems(start, end int64) (int64, string, string) {
	var step int64
	var timeSeriesTableName string
	var samplesTableName string

	if end-start < time.Hour.Milliseconds() {
		// 5 minute aggregation for any query less than 1 hour
		step = 5 * 60
		timeSeriesTableName = constants.SIGNOZ_TIMESERIES_v4_LOCAL_TABLENAME
		samplesTableName = constants.SIGNOZ_SAMPLES_V4_AGG_5M_TABLENAME
	} else if end-start < time.Hour.Milliseconds()*6 {
		// 15 minute aggregation for any query less than 6 hours
		step = 15 * 60
		timeSeriesTableName = constants.SIGNOZ_TIMESERIES_v4_6HRS_LOCAL_TABLENAME
		samplesTableName = constants.SIGNOZ_SAMPLES_V4_AGG_5M_TABLENAME
	} else if end-start < time.Hour.Milliseconds()*24 {
		// 1 hour aggregation for any query less than 1 day
		step = 60 * 60
		timeSeriesTableName = constants.SIGNOZ_TIMESERIES_v4_1DAY_LOCAL_TABLENAME
		samplesTableName = constants.SIGNOZ_SAMPLES_V4_AGG_30M_TABLENAME
	} else if end-start < time.Hour.Milliseconds()*7 {
		// 6 hours aggregation for any query less than 1 week
		step = 6 * 60 * 60
		timeSeriesTableName = constants.SIGNOZ_TIMESERIES_v4_1WEEK_LOCAL_TABLENAME
		samplesTableName = constants.SIGNOZ_SAMPLES_V4_AGG_30M_TABLENAME
	} else {
		// 12 hours aggregation for any query greater than 1 week
		step = 12 * 60 * 60
		timeSeriesTableName = constants.SIGNOZ_TIMESERIES_v4_1WEEK_LOCAL_TABLENAME
		samplesTableName = constants.SIGNOZ_SAMPLES_V4_AGG_30M_TABLENAME
	}
	return step, timeSeriesTableName, samplesTableName
}

func getParamsForTopHosts(req model.HostListRequest) (int64, string, string) {
	return getParamsForTopItems(req.Start, req.End)
}

func getParamsForTopProcesses(req model.ProcessListRequest) (int64, string, string) {
	return getParamsForTopItems(req.Start, req.End)
}

func getParamsForTopPods(req model.PodListRequest) (int64, string, string) {
	return getParamsForTopItems(req.Start, req.End)
}

func getParamsForTopNodes(req model.NodeListRequest) (int64, string, string) {
	return getParamsForTopItems(req.Start, req.End)
}

func getParamsForTopNamespaces(req model.NamespaceListRequest) (int64, string, string) {
	return getParamsForTopItems(req.Start, req.End)
}

func getParamsForTopClusters(req model.ClusterListRequest) (int64, string, string) {
	return getParamsForTopItems(req.Start, req.End)
}

func getParamsForTopDeployments(req model.DeploymentListRequest) (int64, string, string) {
	return getParamsForTopItems(req.Start, req.End)
}

func getParamsForTopDaemonSets(req model.DaemonSetListRequest) (int64, string, string) {
	return getParamsForTopItems(req.Start, req.End)
}

func getParamsForTopStatefulSets(req model.StatefulSetListRequest) (int64, string, string) {
	return getParamsForTopItems(req.Start, req.End)
}

func getParamsForTopJobs(req model.JobListRequest) (int64, string, string) {
	return getParamsForTopItems(req.Start, req.End)
}

func getParamsForTopVolumes(req model.VolumeListRequest) (int64, string, string) {
	return getParamsForTopItems(req.Start, req.End)
}

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
