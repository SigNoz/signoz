package metrics

var MetricsUnderTransition = map[string]string{
	"k8s_pod_cpu_utilization":   "k8s_pod_cpu_usage",
	"k8s_node_cpu_utilization":  "k8s_node_cpu_usage",
	"container_cpu_utilization": "container_cpu_usage",
}
