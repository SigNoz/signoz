package inframonitoringtypes

const ClusterNameAttrKey = "k8s.cluster.name"

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
	ClusterNameAttrKey,
}
