package inframonitoringtypes

const (
	DaemonSetsOrderByCPU            = "cpu"
	DaemonSetsOrderByCPURequest     = "cpu_request"
	DaemonSetsOrderByCPULimit       = "cpu_limit"
	DaemonSetsOrderByMemory         = "memory"
	DaemonSetsOrderByMemoryRequest  = "memory_request"
	DaemonSetsOrderByMemoryLimit    = "memory_limit"
	DaemonSetsOrderByDesiredNodes  = "desired_nodes"
	DaemonSetsOrderByCurrentNodes  = "current_nodes"
)

var DaemonSetsValidOrderByKeys = []string{
	DaemonSetsOrderByCPU,
	DaemonSetsOrderByCPURequest,
	DaemonSetsOrderByCPULimit,
	DaemonSetsOrderByMemory,
	DaemonSetsOrderByMemoryRequest,
	DaemonSetsOrderByMemoryLimit,
	DaemonSetsOrderByDesiredNodes,
	DaemonSetsOrderByCurrentNodes,
}
