package metrics

var MetricsUnderTransition = map[string]string{
	"k8s.pod.cpu.utilization":   "k8s.pod.cpu.usage",
	"k8s.node.cpu.utilization":  "k8s.node.cpu.usage",
	"container.cpu.utilization": "container.cpu.usage",
}

func GetTransitionedMetric(metric string) string {
	if v, ok := MetricsUnderTransition[metric]; ok {
		return v
	}
	return metric
}
