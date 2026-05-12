package inframonitoringtypes

const (
	ClustersOrderByCPU               = "cpu"
	ClustersOrderByCPUAllocatable    = "cpu_allocatable"
	ClustersOrderByMemory            = "memory"
	ClustersOrderByMemoryAllocatable = "memory_allocatable"
)

var ClustersValidOrderByKeys = []string{
	ClustersOrderByCPU,
	ClustersOrderByCPUAllocatable,
	ClustersOrderByMemory,
	ClustersOrderByMemoryAllocatable,
}
