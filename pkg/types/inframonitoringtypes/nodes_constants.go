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

const NodeNameAttrKey = "k8s.node.name"

// NodesTableMetricNames drives node presence checks; includes condition_ready and k8s.pod.phase.
var NodesTableMetricNames = []string{
	"k8s.node.cpu.usage",
	"k8s.node.allocatable_cpu",
	"k8s.node.memory.working_set",
	"k8s.node.allocatable_memory",
	"k8s.node.condition_ready",
	"k8s.pod.phase",
}

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
