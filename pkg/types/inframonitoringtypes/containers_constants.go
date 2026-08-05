package inframonitoringtypes

import "github.com/SigNoz/signoz/pkg/valuer"

// ContainerStatus is the kubectl-style display status of a container, derived
// from k8s.container.status.state (base) + k8s.container.status.reason (overlay).
type ContainerStatus struct {
	valuer.String
}

var (
	// State fallback (from k8s.container.status.state).
	ContainerStatusRunning    = ContainerStatus{valuer.NewString("Running")}
	ContainerStatusWaiting    = ContainerStatus{valuer.NewString("Waiting")}
	ContainerStatusTerminated = ContainerStatus{valuer.NewString("Terminated")}

	// Reasons (from k8s.container.status.reason allowlist).
	ContainerStatusCrashLoopBackOff           = ContainerStatus{valuer.NewString("CrashLoopBackOff")}
	ContainerStatusImagePullBackOff           = ContainerStatus{valuer.NewString("ImagePullBackOff")}
	ContainerStatusErrImagePull               = ContainerStatus{valuer.NewString("ErrImagePull")}
	ContainerStatusCreateContainerConfigError = ContainerStatus{valuer.NewString("CreateContainerConfigError")}
	ContainerStatusContainerCreating          = ContainerStatus{valuer.NewString("ContainerCreating")}
	ContainerStatusOOMKilled                  = ContainerStatus{valuer.NewString("OOMKilled")}
	ContainerStatusCompleted                  = ContainerStatus{valuer.NewString("Completed")}
	ContainerStatusError                      = ContainerStatus{valuer.NewString("Error")}
	ContainerStatusContainerCannotRun         = ContainerStatus{valuer.NewString("ContainerCannotRun")}

	ContainerStatusUnknown = ContainerStatus{valuer.NewString("Unknown")}

	// ContainerStatusNoData is the record default: no status data / metrics disabled.
	ContainerStatusNoData = ContainerStatus{valuer.NewString("no_data")}
)

func (ContainerStatus) Enum() []any {
	return []any{
		ContainerStatusRunning,
		ContainerStatusWaiting,
		ContainerStatusTerminated,
		ContainerStatusCrashLoopBackOff,
		ContainerStatusImagePullBackOff,
		ContainerStatusErrImagePull,
		ContainerStatusCreateContainerConfigError,
		ContainerStatusContainerCreating,
		ContainerStatusOOMKilled,
		ContainerStatusCompleted,
		ContainerStatusError,
		ContainerStatusContainerCannotRun,
		ContainerStatusUnknown,
		ContainerStatusNoData,
	}
}

// ContainerReady is the latest readiness of a container (k8s.container.ready).
type ContainerReady struct {
	valuer.String
}

var (
	ContainerReadyReady    = ContainerReady{valuer.NewString("ready")}
	ContainerReadyNotReady = ContainerReady{valuer.NewString("not_ready")}
	// ContainerReadyNoData is the record default: no readiness data.
	ContainerReadyNoData = ContainerReady{valuer.NewString("no_data")}
)

func (ContainerReady) Enum() []any {
	return []any{
		ContainerReadyReady,
		ContainerReadyNotReady,
		ContainerReadyNoData,
	}
}

const ContainerNameAttrKey = "k8s.container.name"

const (
	ContainersOrderByCPU           = "cpu"
	ContainersOrderByCPURequest    = "cpu_request"
	ContainersOrderByCPULimit      = "cpu_limit"
	ContainersOrderByMemory        = "memory"
	ContainersOrderByMemoryRequest = "memory_request"
	ContainersOrderByMemoryLimit   = "memory_limit"
)

var ContainersValidOrderByKeys = []string{
	ContainersOrderByCPU,
	ContainersOrderByCPURequest,
	ContainersOrderByCPULimit,
	ContainersOrderByMemory,
	ContainersOrderByMemoryRequest,
	ContainersOrderByMemoryLimit,
	ContainerNameAttrKey,
}
