package inframonitoringtypes

import "github.com/SigNoz/signoz/pkg/valuer"

type NodeCondition struct {
	valuer.String
}

var (
	NodeConditionReady    = NodeCondition{valuer.NewString("ready")}
	NodeConditionNotReady = NodeCondition{valuer.NewString("not_ready")}
	NodeConditionNoData   = NodeCondition{valuer.NewString("no_data")}
)

func (NodeCondition) Enum() []any {
	return []any{
		NodeConditionReady,
		NodeConditionNotReady,
		NodeConditionNoData,
	}
}

// Numeric values emitted by the k8s.node.condition_ready metric
// (source: OTel kubeletstats receiver).
const (
	NodeConditionNumReady    = 1
	NodeConditionNumNotReady = 0
)

const (
	NodesOrderByCPU               = "cpu"
	NodesOrderByCPUAllocatable    = "cpu_allocatable"
	NodesOrderByMemory            = "memory"
	NodesOrderByMemoryAllocatable = "memory_allocatable"
)

var NodesValidOrderByKeys = []string{
	NodesOrderByCPU,
	NodesOrderByCPUAllocatable,
	NodesOrderByMemory,
	NodesOrderByMemoryAllocatable,
}
