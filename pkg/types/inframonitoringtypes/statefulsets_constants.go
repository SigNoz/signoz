package inframonitoringtypes

const (
	StatefulSetsOrderByCPU           = "cpu"
	StatefulSetsOrderByCPURequest    = "cpu_request"
	StatefulSetsOrderByCPULimit      = "cpu_limit"
	StatefulSetsOrderByMemory        = "memory"
	StatefulSetsOrderByMemoryRequest = "memory_request"
	StatefulSetsOrderByMemoryLimit   = "memory_limit"
	StatefulSetsOrderByDesiredPods   = "desired_pods"
	StatefulSetsOrderByCurrentPods   = "current_pods"
)

var StatefulSetsValidOrderByKeys = []string{
	StatefulSetsOrderByCPU,
	StatefulSetsOrderByCPURequest,
	StatefulSetsOrderByCPULimit,
	StatefulSetsOrderByMemory,
	StatefulSetsOrderByMemoryRequest,
	StatefulSetsOrderByMemoryLimit,
	StatefulSetsOrderByDesiredPods,
	StatefulSetsOrderByCurrentPods,
}
