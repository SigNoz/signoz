package metrics

var MetricsUnderTransition = map[string]string{
	"k8s_pod_cpu_utilization":   "k8s_pod_cpu_usage",
	"k8s_node_cpu_utilization":  "k8s_node_cpu_usage",
	"container_cpu_utilization": "container_cpu_usage",
}

var DotMetricsUnderTransition = map[string]string{
	"k8s.pod.cpu.utilization":   "k8s.pod.cpu.usage",
	"k8s.node.cpu.utilization":  "k8s.node.cpu.usage",
	"container.cpu.utilization": "container.cpu.usage",
}

func GetTransitionedMetrics(metrics string, normalized bool) string {
	if normalized {
		if _, ok := MetricsUnderTransition[metrics]; ok {
			return MetricsUnderTransition[metrics]
		}
		return metrics
	} else {
		if _, ok := DotMetricsUnderTransition[metrics]; ok {
			return DotMetricsUnderTransition[metrics]
		}
		return metrics
	}
}
