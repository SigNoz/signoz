package inframonitoringtypes

const (
	DeploymentsOrderByCPU           = "cpu"
	DeploymentsOrderByCPURequest    = "cpu_request"
	DeploymentsOrderByCPULimit      = "cpu_limit"
	DeploymentsOrderByMemory        = "memory"
	DeploymentsOrderByMemoryRequest = "memory_request"
	DeploymentsOrderByMemoryLimit   = "memory_limit"
	DeploymentsOrderByDesiredPods   = "desired_pods"
	DeploymentsOrderByAvailablePods = "available_pods"
)

var DeploymentsValidOrderByKeys = []string{
	DeploymentsOrderByCPU,
	DeploymentsOrderByCPURequest,
	DeploymentsOrderByCPULimit,
	DeploymentsOrderByMemory,
	DeploymentsOrderByMemoryRequest,
	DeploymentsOrderByMemoryLimit,
	DeploymentsOrderByDesiredPods,
	DeploymentsOrderByAvailablePods,
}
