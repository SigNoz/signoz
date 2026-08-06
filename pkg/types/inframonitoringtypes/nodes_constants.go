package inframonitoringtypes

import (
	"slices"

	"github.com/SigNoz/signoz/pkg/valuer"
)

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

// IsFilterableNodeCondition reports whether c is a concrete, user-filterable
// node readiness: any Enum() member except the no_data sentinel.
func IsFilterableNodeCondition(c NodeCondition) bool {
	return c != NodeConditionNoData && slices.Contains((NodeCondition{}).Enum(), any(c))
}

// Numeric values emitted by the k8s.node.condition_ready metric
// (source: OTel kubeletstats receiver).
const (
	NodeConditionNumReady    = 1
	NodeConditionNumNotReady = 0
)

const NodeNameAttrKey = "k8s.node.name"

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
	NodeNameAttrKey,
}
