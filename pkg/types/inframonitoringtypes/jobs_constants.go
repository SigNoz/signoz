package inframonitoringtypes

const (
	JobsOrderByCPU                   = "cpu"
	JobsOrderByCPURequest            = "cpu_request"
	JobsOrderByCPULimit              = "cpu_limit"
	JobsOrderByMemory                = "memory"
	JobsOrderByMemoryRequest         = "memory_request"
	JobsOrderByMemoryLimit           = "memory_limit"
	JobsOrderByDesiredSuccessfulPods = "desired_successful_pods"
	JobsOrderByActivePods            = "active_pods"
	JobsOrderByFailedPods            = "failed_pods"
	JobsOrderBySuccessfulPods        = "successful_pods"
)

var JobsValidOrderByKeys = []string{
	JobsOrderByCPU,
	JobsOrderByCPURequest,
	JobsOrderByCPULimit,
	JobsOrderByMemory,
	JobsOrderByMemoryRequest,
	JobsOrderByMemoryLimit,
	JobsOrderByDesiredSuccessfulPods,
	JobsOrderByActivePods,
	JobsOrderByFailedPods,
	JobsOrderBySuccessfulPods,
}
