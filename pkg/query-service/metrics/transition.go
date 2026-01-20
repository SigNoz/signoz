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

func GetTransitionedMetric(metric string, normalized bool) string {
	if normalized {
		if _, ok := MetricsUnderTransition[metric]; ok {
			return MetricsUnderTransition[metric]
		}
		return metric
	} else {
		if _, ok := DotMetricsUnderTransition[metric]; ok {
			return DotMetricsUnderTransition[metric]
		}
		return metric
	}
}
