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
}
