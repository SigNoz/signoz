package inframonitoringtypes

const (
	StatefulSetsOrderByCPU           = "cpu"
	StatefulSetsOrderByCPURequest    = "cpu_request"
	StatefulSetsOrderByCPULimit      = "cpu_limit"
	StatefulSetsOrderByMemory        = "memory"
	StatefulSetsOrderByMemoryRequest = "memory_request"
	StatefulSetsOrderByMemoryLimit   = "memory_limit"
	StatefulSetsOrderByDesiredPods   = "desired_pods"
	StatefulSetsOrderByAvailablePods = "available_pods"
)

var StatefulSetsValidOrderByKeys = []string{
	StatefulSetsOrderByCPU,
	StatefulSetsOrderByCPURequest,
	StatefulSetsOrderByCPULimit,
	StatefulSetsOrderByMemory,
	StatefulSetsOrderByMemoryRequest,
	StatefulSetsOrderByMemoryLimit,
	StatefulSetsOrderByDesiredPods,
	StatefulSetsOrderByAvailablePods,
	OrderByName,
}
