package inframetrics

import (
	"strings"
	"time"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
)

var (
	// TODO(srikanthccv): import metadata yaml from receivers and use generated files to check the metrics
	podMetricNamesToCheck = []string{
		"k8s_pod_cpu_utilization",
		"k8s_pod_memory_usage",
		"k8s_pod_cpu_request_utilization",
		"k8s_pod_memory_request_utilization",
		"k8s_pod_cpu_limit_utilization",
		"k8s_pod_memory_limit_utilization",
		"k8s_container_restarts",
		"k8s_pod_phase",
	}
	nodeMetricNamesToCheck = []string{
		"k8s_node_cpu_utilization",
		"k8s_node_allocatable_cpu",
		"k8s_node_memory_usage",
		"k8s_node_allocatable_memory",
		"k8s_node_condition_ready",
	}
	clusterMetricNamesToCheck = []string{
		"k8s_daemonset_desired_scheduled_nodes",
		"k8s_daemonset_current_scheduled_nodes",
		"k8s_deployment_desired",
		"k8s_deployment_available",
		"k8s_job_desired_successful_pods",
		"k8s_job_active_pods",
		"k8s_job_failed_pods",
		"k8s_job_successful_pods",
		"k8s_statefulset_desired_pods",
		"k8s_statefulset_current_pods",
	}
	optionalPodMetricNamesToCheck = []string{
		"k8s_pod_cpu_request_utilization",
		"k8s_pod_memory_request_utilization",
		"k8s_pod_cpu_limit_utilization",
		"k8s_pod_memory_limit_utilization",
	}

	// did they ever send _any_ pod metrics?
	didSendPodMetricsQuery = `
	SELECT count() FROM %s.%s WHERE metric_name IN (%s)
`

	// did they ever send any node metrics?
	didSendNodeMetricsQuery = `
	SELECT count() FROM %s.%s WHERE metric_name IN (%s)
`

	// did they ever send any cluster metrics?
	didSendClusterMetricsQuery = `
	SELECT count() FROM %s.%s WHERE metric_name IN (%s)
`

	// if they ever sent _any_ pod metrics, we assume they know how to send pod metrics
	// now, are they sending optional pod metrics such request/limit metrics?
	isSendingOptionalPodMetricsQuery = `
	SELECT count() FROM %s.%s WHERE metric_name IN (%s)
`

	// there should be [cluster, node, namespace, one of (deployment, statefulset, daemonset, cronjob, job)] for each pod
	isSendingRequiredMetadataQuery = `
	SELECT any(JSONExtractString(labels, 'k8s_cluster_name')) as k8s_cluster_name,
		any(JSONExtractString(labels, 'k8s_node_name')) as k8s_node_name,
		any(JSONExtractString(labels, 'k8s_namespace_name')) as k8s_namespace_name,
		any(JSONExtractString(labels, 'k8s_deployment_name')) as k8s_deployment_name,
		any(JSONExtractString(labels, 'k8s_statefulset_name')) as k8s_statefulset_name,
		any(JSONExtractString(labels, 'k8s_daemonset_name')) as k8s_daemonset_name,
		any(JSONExtractString(labels, 'k8s_cronjob_name')) as k8s_cronjob_name,
		any(JSONExtractString(labels, 'k8s_job_name')) as k8s_job_name,
		JSONExtractString(labels, 'k8s_pod_name') as k8s_pod_name
	FROM %s.%s WHERE metric_name IN (%s)
		AND (unix_milli >= (toUnixTimestamp(now() - toIntervalMinute(60)) * 1000))
		AND JSONExtractString(labels, 'k8s_namespace_name') NOT IN ('kube-system', 'kube-public', 'kube-node-lease', 'metallb-system')
	GROUP BY k8s_pod_name
	LIMIT 1 BY k8s_cluster_name, k8s_node_name, k8s_namespace_name
`
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
