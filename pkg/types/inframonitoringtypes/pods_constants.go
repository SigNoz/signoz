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

// PodStatus is the kubectl-style pod display status, derived from
// k8s.pod.phase + k8s.pod.status_reason + k8s.container.status.reason
// (priority cascade: container reason > pod-level reason > phase).
// Wire values are lowercased by valuer.NewString (e.g. "crashloopbackoff");
// the comment strings below are the kubectl spelling for readability. The
// query emits kubectl-style strings, so SQL output maps to these constants
// explicitly (not by raw string-wrapping).
type PodStatus struct {
	valuer.String
}

var (
	// Phase fallback.
	PodStatusPending = PodStatus{valuer.NewString("Pending")}
	PodStatusRunning = PodStatus{valuer.NewString("Running")}
	PodStatusFailed  = PodStatus{valuer.NewString("Failed")}
	PodStatusUnknown = PodStatus{valuer.NewString("Unknown")}

	// Container-level reasons (k8s.container.status.reason allowlist).
	PodStatusCrashLoopBackOff           = PodStatus{valuer.NewString("CrashLoopBackOff")}
	PodStatusImagePullBackOff           = PodStatus{valuer.NewString("ImagePullBackOff")}
	PodStatusErrImagePull               = PodStatus{valuer.NewString("ErrImagePull")}
	PodStatusCreateContainerConfigError = PodStatus{valuer.NewString("CreateContainerConfigError")}
	PodStatusContainerCreating          = PodStatus{valuer.NewString("ContainerCreating")}
	PodStatusOOMKilled                  = PodStatus{valuer.NewString("OOMKilled")}
	PodStatusCompleted                  = PodStatus{valuer.NewString("Completed")}
	PodStatusError                      = PodStatus{valuer.NewString("Error")}
	PodStatusContainerCannotRun         = PodStatus{valuer.NewString("ContainerCannotRun")}

	// Pod-level reasons (k8s.pod.status_reason).
	PodStatusEvicted                  = PodStatus{valuer.NewString("Evicted")}
	PodStatusNodeAffinity             = PodStatus{valuer.NewString("NodeAffinity")}
	PodStatusNodeLost                 = PodStatus{valuer.NewString("NodeLost")}
	PodStatusShutdown                 = PodStatus{valuer.NewString("Shutdown")}
	PodStatusUnexpectedAdmissionError = PodStatus{valuer.NewString("UnexpectedAdmissionError")}

	// Sentinel when status cannot be derived (metrics absent / not in list view).
	PodStatusNoData = PodStatus{valuer.NewString("no_data")}
)

func (PodStatus) Enum() []any {
	return []any{
		PodStatusPending,
		PodStatusRunning,
		PodStatusFailed,
		PodStatusUnknown,
		PodStatusCrashLoopBackOff,
		PodStatusImagePullBackOff,
		PodStatusErrImagePull,
		PodStatusCreateContainerConfigError,
		PodStatusContainerCreating,
		PodStatusOOMKilled,
		PodStatusCompleted,
		PodStatusError,
		PodStatusContainerCannotRun,
		PodStatusEvicted,
		PodStatusNodeAffinity,
		PodStatusNodeLost,
		PodStatusShutdown,
		PodStatusUnexpectedAdmissionError,
		PodStatusNoData,
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
