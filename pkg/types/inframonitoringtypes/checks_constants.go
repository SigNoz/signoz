package inframonitoringtypes

import "github.com/SigNoz/signoz/pkg/valuer"

// CheckType identifies a single infra-monitoring subsection (UI tab).
// One value per v1/v2 list API we surface in the infra-monitoring section.
type CheckType struct {
	valuer.String
}

var (
	CheckTypeHosts          = CheckType{valuer.NewString("hosts")}
	CheckTypeProcesses      = CheckType{valuer.NewString("processes")}
	CheckTypePods           = CheckType{valuer.NewString("pods")}
	CheckTypeNodes          = CheckType{valuer.NewString("nodes")}
	CheckTypeDeployments    = CheckType{valuer.NewString("deployments")}
	CheckTypeDaemonsets     = CheckType{valuer.NewString("daemonsets")}
	CheckTypeStatefulsets   = CheckType{valuer.NewString("statefulsets")}
	CheckTypeJobs           = CheckType{valuer.NewString("jobs")}
	CheckTypeNamespaces     = CheckType{valuer.NewString("namespaces")}
	CheckTypeClusters       = CheckType{valuer.NewString("clusters")}
	CheckTypeVolumes        = CheckType{valuer.NewString("volumes")}
	CheckTypeKubeContainers = CheckType{valuer.NewString("kube_containers")}
)

func (CheckType) Enum() []any {
	return []any{
		CheckTypeHosts,
		CheckTypeProcesses,
		CheckTypePods,
		CheckTypeNodes,
		CheckTypeDeployments,
		CheckTypeDaemonsets,
		CheckTypeStatefulsets,
		CheckTypeJobs,
		CheckTypeNamespaces,
		CheckTypeClusters,
		CheckTypeVolumes,
		CheckTypeKubeContainers,
	}
}

var ValidCheckTypes = []CheckType{
	CheckTypeHosts,
	CheckTypeProcesses,
	CheckTypePods,
	CheckTypeNodes,
	CheckTypeDeployments,
	CheckTypeDaemonsets,
	CheckTypeStatefulsets,
	CheckTypeJobs,
	CheckTypeNamespaces,
	CheckTypeClusters,
	CheckTypeVolumes,
	CheckTypeKubeContainers,
}

// CheckComponentType tags each AssociatedComponent as either a receiver or a processor.
// Only these two values are ever written by the module.
type CheckComponentType struct {
	valuer.String
}

var (
	CheckComponentTypeReceiver  = CheckComponentType{valuer.NewString("receiver")}
	CheckComponentTypeProcessor = CheckComponentType{valuer.NewString("processor")}
)

func (CheckComponentType) Enum() []any {
	return []any{
		CheckComponentTypeReceiver,
		CheckComponentTypeProcessor,
	}
}
