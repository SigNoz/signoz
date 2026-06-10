package inframonitoringtypes

import "github.com/SigNoz/signoz/pkg/valuer"

type PodPhase struct {
	valuer.String
}

var (
	PodPhasePending   = PodPhase{valuer.NewString("pending")}
	PodPhaseRunning   = PodPhase{valuer.NewString("running")}
	PodPhaseSucceeded = PodPhase{valuer.NewString("succeeded")}
	PodPhaseFailed    = PodPhase{valuer.NewString("failed")}
	PodPhaseUnknown   = PodPhase{valuer.NewString("unknown")}
	PodPhaseNoData    = PodPhase{valuer.NewString("no_data")}
)

func (PodPhase) Enum() []any {
	return []any{
		PodPhasePending,
		PodPhaseRunning,
		PodPhaseSucceeded,
		PodPhaseFailed,
		PodPhaseUnknown,
		PodPhaseNoData,
	}
}

// Numeric pod phase values emitted by the k8s.pod.phase metric
// (source: OTel kubeletstats receiver).
const (
	PodPhaseNumPending   = 1
	PodPhaseNumRunning   = 2
	PodPhaseNumSucceeded = 3
	PodPhaseNumFailed    = 4
	PodPhaseNumUnknown   = 5
)

const PodNameAttrKey = "k8s.pod.name"

// PodsTableMetricNames drives pod presence checks (infra monitoring, empty-state).
var PodsTableMetricNames = []string{
	"k8s.pod.cpu.usage",
	"k8s.pod.cpu_request_utilization",
	"k8s.pod.cpu_limit_utilization",
	"k8s.pod.memory.working_set",
	"k8s.pod.memory_request_utilization",
	"k8s.pod.memory_limit_utilization",
	"k8s.pod.phase",
}

const (
	PodsOrderByCPU           = "cpu"
	PodsOrderByCPURequest    = "cpu_request"
	PodsOrderByCPULimit      = "cpu_limit"
	PodsOrderByMemory        = "memory"
	PodsOrderByMemoryRequest = "memory_request"
	PodsOrderByMemoryLimit   = "memory_limit"
)

var PodsValidOrderByKeys = []string{
	PodsOrderByCPU,
	PodsOrderByCPURequest,
	PodsOrderByCPULimit,
	PodsOrderByMemory,
	PodsOrderByMemoryRequest,
	PodsOrderByMemoryLimit,
	PodNameAttrKey,
}
