package inframetrics

import (
	"fmt"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/model"
)

var dotMetricMap = map[string]string{
	"system_cpu_time":                       "system.cpu.time",
	"system_memory_usage":                   "system.memory.usage",
	"system_cpu_load_average_15m":           "system.cpu.load_average.15m",
	"host_name":                             "host.name",
	"k8s_cluster_name":                      "k8s.cluster.name",
	"k8s_node_name":                         "k8s.node.name",
	"k8s_pod_memory_usage":                  "k8s.pod.memory.usage",
	"k8s_pod_cpu_request_utilization":       "k8s.pod.cpu_request_utilization",
	"k8s_pod_memory_request_utilization":    "k8s.pod.memory_request_utilization",
	"k8s_pod_cpu_limit_utilization":         "k8s.pod.cpu_limit_utilization",
	"k8s_pod_memory_limit_utilization":      "k8s.pod.memory_limit_utilization",
	"k8s_container_restarts":                "k8s.container.restarts",
	"k8s_pod_phase":                         "k8s.pod.phase",
	"k8s_node_allocatable_cpu":              "k8s.node.allocatable_cpu",
	"k8s_node_allocatable_memory":           "k8s.node.allocatable_memory",
	"k8s_node_memory_usage":                 "k8s.node.memory.usage",
	"k8s_node_condition_ready":              "k8s.node.condition_ready",
	"k8s_daemonset_desired_scheduled_nodes": "k8s.daemonset.desired_scheduled_nodes",
	"k8s_daemonset_current_scheduled_nodes": "k8s.daemonset.current_scheduled_nodes",
	"k8s_deployment_desired":                "k8s.deployment.desired",
	"k8s_deployment_available":              "k8s.deployment.available",
	"k8s_job_desired_successful_pods":       "k8s.job.desired_successful_pods",
	"k8s_job_active_pods":                   "k8s.job.active_pods",
	"k8s_job_failed_pods":                   "k8s.job.failed_pods",
	"k8s_job_successful_pods":               "k8s.job.successful_pods",
	"k8s_statefulset_desired_pods":          "k8s.statefulset.desired_pods",
	"k8s_statefulset_current_pods":          "k8s.statefulset.current_pods",
	"k8s_namespace_name":                    "k8s.namespace.name",
	"k8s_deployment_name":                   "k8s.deployment.name",
	"k8s_cronjob_name":                      "k8s.cronjob.name",
	"k8s_job_name":                          "k8s.job.name",
	"k8s_daemonset_name":                    "k8s.daemonset.name",
	"os_type":                               "os.type",
	"process_cgroup":                        "process.cgroup",
	"process_pid":                           "process.pid",
	"process_parent_pid":                    "process.parent_pid",
	"process_owner":                         "process.owner",
	"process_executable_path":               "process.executable.path",
	"process_executable_name":               "process.executable.name",
	"process_command_line":                  "process.command_line",
	"process_command":                       "process.command",
	"process_memory_usage":                  "process.memory.usage",
	"k8s_persistentvolumeclaim_name":        "k8s.persistentvolumeclaim.name",
	"k8s_volume_available":                  "k8s.volume.available",
	"k8s_volume_capacity":                   "k8s.volume.capacity",
	"k8s_volume_inodes":                     "k8s.volume.inodes",
	"k8s_volume_inodes_free":                "k8s.volume.inodes.free",
	// add additional mappings as needed

	"k8s_pod_uid":              "k8s.pod.uid",
	"k8s_pod_name":             "k8s.pod.name",
	"k8s_container_name":       "k8s.container.name",
	"container_id":             "container.id",
	"k8s_volume_name":          "k8s.volume.name",
	"k8s_volume_type":          "k8s.volume.type",
	"aws_volume_id":            "aws.volume.id",
	"fs_type":                  "fs.type",
	"partition":                "partition",
	"gce_pd_name":              "gce.pd.name",
	"glusterfs_endpoints_name": "glusterfs.endpoints.name",
	"glusterfs_path":           "glusterfs.path",
	"interface":                "interface",
	"direction":                "direction",

	"k8s_node_cpu_usage":                "k8s.node.cpu.usage",
	"k8s_node_cpu_time":                 "k8s.node.cpu.time",
	"k8s_node_memory_available":         "k8s.node.memory.available",
	"k8s_node_memory_rss":               "k8s.node.memory.rss",
	"k8s_node_memory_working_set":       "k8s.node.memory.working_set",
	"k8s_node_memory_page_faults":       "k8s.node.memory.page_faults",
	"k8s_node_memory_major_page_faults": "k8s.node.memory.major_page_faults",
	"k8s_node_filesystem_available":     "k8s.node.filesystem.available",
	"k8s_node_filesystem_capacity":      "k8s.node.filesystem.capacity",
	"k8s_node_filesystem_usage":         "k8s.node.filesystem.usage",
	"k8s_node_network_io":               "k8s.node.network.io",
	"k8s_node_network_errors":           "k8s.node.network.errors",
	"k8s_node_uptime":                   "k8s.node.uptime",

	"k8s_pod_cpu_usage":                "k8s.pod.cpu.usage",
	"k8s_pod_cpu_time":                 "k8s.pod.cpu.time",
	"k8s_pod_memory_available":         "k8s.pod.memory.available",
	"k8s_pod_cpu_node_utilization":     "k8s.pod.cpu.node.utilization",
	"k8s_pod_memory_node_utilization":  "k8s.pod.memory.node.utilization",
	"k8s_pod_memory_rss":               "k8s.pod.memory.rss",
	"k8s_pod_memory_working_set":       "k8s.pod.memory.working_set",
	"k8s_pod_memory_page_faults":       "k8s.pod.memory.page_faults",
	"k8s_pod_memory_major_page_faults": "k8s.pod.memory.major_page_faults",
	"k8s_pod_filesystem_available":     "k8s.pod.filesystem.available",
	"k8s_pod_filesystem_capacity":      "k8s.pod.filesystem.capacity",
	"k8s_pod_filesystem_usage":         "k8s.pod.filesystem.usage",
	"k8s_pod_network_io":               "k8s.pod.network.io",
	"k8s_pod_network_errors":           "k8s.pod.network.errors",
	"k8s_pod_uptime":                   "k8s.pod.uptime",

	"container_cpu_usage":                      "container.cpu.usage",
	"container_cpu_time":                       "container.cpu.time",
	"container_memory_available":               "container.memory.available",
	"container_memory_usage":                   "container.memory.usage",
	"k8s_container_cpu_node_utilization":       "k8s.container.cpu.node.utilization",
	"k8s_container_cpu_limit_utilization":      "k8s.container.cpu_limit_utilization",
	"k8s_container_cpu_request_utilization":    "k8s.container.cpu_request_utilization",
	"k8s_container_memory_node_utilization":    "k8s.container.memory.node.utilization",
	"k8s_container_memory_limit_utilization":   "k8s.container.memory_limit_utilization",
	"k8s_container_memory_request_utilization": "k8s.container.memory_request_utilization",
	"container_memory_rss":                     "container.memory.rss",
	"container_memory_working_set":             "container.memory.working_set",
	"container_memory_page_faults":             "container.memory.page_faults",
	"container_memory_major_page_faults":       "container.memory.major_page_faults",
	"container_filesystem_available":           "container.filesystem.available",
	"container_filesystem_capacity":            "container.filesystem.capacity",
	"container_filesystem_usage":               "container.filesystem.usage",
	"container_uptime":                         "container.uptime",

	"k8s_volume_inodes_used": "k8s.volume.inodes.used",

	"k8s_namespace_uid":                           "k8s.namespace.uid",
	"container_image_name":                        "container.image.name",
	"container_image_tag":                         "container.image.tag",
	"k8s_pod_qos_class":                           "k8s.pod.qos_class",
	"k8s_replicaset_name":                         "k8s.replicaset.name",
	"k8s_replicaset_uid":                          "k8s.replicaset.uid",
	"k8s_replicationcontroller_name":              "k8s.replicationcontroller.name",
	"k8s_replicationcontroller_uid":               "k8s.replicationcontroller.uid",
	"k8s_resourcequota_uid":                       "k8s.resourcequota.uid",
	"k8s_resourcequota_name":                      "k8s.resourcequota.name",
	"k8s_statefulset_uid":                         "k8s.statefulset.uid",
	"k8s_statefulset_name":                        "k8s.statefulset.name",
	"k8s_deployment_uid":                          "k8s.deployment.uid",
	"k8s_cronjob_uid":                             "k8s.cronjob.uid",
	"k8s_daemonset_uid":                           "k8s.daemonset.uid",
	"k8s_hpa_uid":                                 "k8s.hpa.uid",
	"k8s_hpa_name":                                "k8s.hpa.name",
	"k8s_hpa_scaletargetref_kind":                 "k8s.hpa.scaletargetref.kind",
	"k8s_hpa_scaletargetref_name":                 "k8s.hpa.scaletargetref.name",
	"k8s_hpa_scaletargetref_apiversion":           "k8s.hpa.scaletargetref.apiversion",
	"k8s_job_uid":                                 "k8s.job.uid",
	"k8s_kubelet_version":                         "k8s.kubelet.version",
	"container_runtime":                           "container.runtime",
	"container_runtime_version":                   "container.runtime.version",
	"os_description":                              "os.description",
	"openshift_clusterquota_uid":                  "openshift.clusterquota.uid",
	"openshift_clusterquota_name":                 "openshift.clusterquota.name",
	"k8s_container_status_last_terminated_reason": "k8s.container.status.last_terminated_reason",

	"resource":  "resource",
	"condition": "condition",

	"k8s_container_cpu_request":              "k8s.container.cpu_request",
	"k8s_container_cpu_limit":                "k8s.container.cpu_limit",
	"k8s_container_memory_request":           "k8s.container.memory_request",
	"k8s_container_memory_limit":             "k8s.container.memory_limit",
	"k8s_container_storage_request":          "k8s.container.storage_request",
	"k8s_container_storage_limit":            "k8s.container.storage_limit",
	"k8s_container_ephemeralstorage_request": "k8s.container.ephemeralstorage_request",
	"k8s_container_ephemeralstorage_limit":   "k8s.container.ephemeralstorage_limit",
	"k8s_container_ready":                    "k8s.container.ready",

	"k8s_pod_status_reason": "k8s.pod.status_reason",

	"k8s_cronjob_active_jobs": "k8s.cronjob.active_jobs",

	"k8s_daemonset_misscheduled_nodes": "k8s.daemonset.misscheduled_nodes",
	"k8s_daemonset_ready_nodes":        "k8s.daemonset.ready_nodes",

	"k8s_hpa_max_replicas":     "k8s.hpa.max_replicas",
	"k8s_hpa_min_replicas":     "k8s.hpa.min_replicas",
	"k8s_hpa_current_replicas": "k8s.hpa.current_replicas",
	"k8s_hpa_desired_replicas": "k8s.hpa.desired_replicas",

	"k8s_job_max_parallel_pods": "k8s.job.max_parallel_pods",

	"k8s_namespace_phase": "k8s.namespace.phase",

	"k8s_replicaset_desired":   "k8s.replicaset.desired",
	"k8s_replicaset_available": "k8s.replicaset.available",

	"k8s_replication_controller_desired":   "k8s.replication_controller.desired",
	"k8s_replication_controller_available": "k8s.replication_controller.available",

	"k8s_resource_quota_hard_limit": "k8s.resource_quota.hard_limit",
	"k8s_resource_quota_used":       "k8s.resource_quota.used",

	"k8s_statefulset_updated_pods": "k8s.statefulset.updated_pods",

	"k8s_node_condition": "k8s.node.condition",
}

const fromWhereQuery = `
FROM %s.%s
WHERE metric_name IN (%s)
  AND unix_milli >= toUnixTimestamp(now() - toIntervalMinute(60)) * 1000
`

var (
	// TODO(srikanthccv): import metadata yaml from receivers and use generated files to check the metrics
	podMetricNamesToCheck = []string{
		GetDotMetrics("k8s_pod_cpu_usage"),
		GetDotMetrics("k8s_pod_memory_working_set"),
		GetDotMetrics("k8s_pod_cpu_request_utilization"),
		GetDotMetrics("k8s_pod_memory_request_utilization"),
		GetDotMetrics("k8s_pod_cpu_limit_utilization"),
		GetDotMetrics("k8s_pod_memory_limit_utilization"),
		GetDotMetrics("k8s_container_restarts"),
		GetDotMetrics("k8s_pod_phase"),
	}
	nodeMetricNamesToCheck = []string{
		GetDotMetrics("k8s_node_cpu_usage"),
		GetDotMetrics("k8s_node_allocatable_cpu"),
		GetDotMetrics("k8s_node_memory_working_set"),
		GetDotMetrics("k8s_node_allocatable_memory"),
		GetDotMetrics("k8s_node_condition_ready"),
	}
	clusterMetricNamesToCheck = []string{
		GetDotMetrics("k8s_daemonset_desired_scheduled_nodes"),
		GetDotMetrics("k8s_daemonset_current_scheduled_nodes"),
		GetDotMetrics("k8s_deployment_desired"),
		GetDotMetrics("k8s_deployment_available"),
		GetDotMetrics("k8s_job_desired_successful_pods"),
		GetDotMetrics("k8s_job_active_pods"),
		GetDotMetrics("k8s_job_failed_pods"),
		GetDotMetrics("k8s_job_successful_pods"),
		GetDotMetrics("k8s_statefulset_desired_pods"),
		GetDotMetrics("k8s_statefulset_current_pods"),
	}
	optionalPodMetricNamesToCheck = []string{
		GetDotMetrics("k8s_pod_cpu_request_utilization"),
		GetDotMetrics("k8s_pod_memory_request_utilization"),
		GetDotMetrics("k8s_pod_cpu_limit_utilization"),
		GetDotMetrics("k8s_pod_memory_limit_utilization"),
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

	selectQuery = fmt.Sprintf(`
SELECT
    any(JSONExtractString(labels, '%s')) as k8s_cluster_name,
    any(JSONExtractString(labels, '%s')) as k8s_node_name,
    any(JSONExtractString(labels, '%s')) as k8s_namespace_name,
    any(JSONExtractString(labels, '%s')) as k8s_deployment_name,
    any(JSONExtractString(labels, '%s')) as k8s_statefulset_name,
    any(JSONExtractString(labels, '%s')) as k8s_daemonset_name,
    any(JSONExtractString(labels, '%s')) as k8s_cronjob_name,
    any(JSONExtractString(labels, '%s')) as k8s_job_name,
    JSONExtractString(labels, '%s')       as k8s_pod_name
`,
		GetDotMetrics("k8s_cluster_name"),
		GetDotMetrics("k8s_node_name"),
		GetDotMetrics("k8s_namespace_name"),
		GetDotMetrics("k8s_deployment_name"),
		GetDotMetrics("k8s_statefulset_name"),
		GetDotMetrics("k8s_daemonset_name"),
		GetDotMetrics("k8s_cronjob_name"),
		GetDotMetrics("k8s_job_name"),
		GetDotMetrics("k8s_pod_name"),
	)

	filterGroupQuery = fmt.Sprintf(`
AND JSONExtractString(labels, '%s')
    NOT IN ('kube-system','kube-public','kube-node-lease','metallb-system')
GROUP BY k8s_pod_name
LIMIT 1 BY k8s_cluster_name, k8s_node_name, k8s_namespace_name
`,
		GetDotMetrics("k8s_namespace_name"),
	)

	isSendingRequiredMetadataQuery = selectQuery + fromWhereQuery + filterGroupQuery
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

func GetDotMetrics(key string) string {
	if constants.IsDotMetricsEnabled {
		if _, ok := dotMetricMap[key]; ok {
			return dotMetricMap[key]
		}
	}
	return key
}
