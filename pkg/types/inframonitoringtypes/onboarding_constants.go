package inframonitoringtypes

import "github.com/SigNoz/signoz/pkg/valuer"

// OnboardingType identifies a single infra-monitoring subsection (UI tab).
// One value per v1/v2 list API we surface in the infra-monitoring section.
type OnboardingType struct {
	valuer.String
}

var (
	OnboardingTypeHosts        = OnboardingType{valuer.NewString("hosts")}
	OnboardingTypeProcesses    = OnboardingType{valuer.NewString("processes")}
	OnboardingTypePods         = OnboardingType{valuer.NewString("pods")}
	OnboardingTypeNodes        = OnboardingType{valuer.NewString("nodes")}
	OnboardingTypeDeployments  = OnboardingType{valuer.NewString("deployments")}
	OnboardingTypeDaemonsets   = OnboardingType{valuer.NewString("daemonsets")}
	OnboardingTypeStatefulsets = OnboardingType{valuer.NewString("statefulsets")}
	OnboardingTypeJobs         = OnboardingType{valuer.NewString("jobs")}
	OnboardingTypeNamespaces   = OnboardingType{valuer.NewString("namespaces")}
	OnboardingTypeClusters     = OnboardingType{valuer.NewString("clusters")}
	OnboardingTypeVolumes      = OnboardingType{valuer.NewString("volumes")}
)

func (OnboardingType) Enum() []any {
	return []any{
		OnboardingTypeHosts,
		OnboardingTypeProcesses,
		OnboardingTypePods,
		OnboardingTypeNodes,
		OnboardingTypeDeployments,
		OnboardingTypeDaemonsets,
		OnboardingTypeStatefulsets,
		OnboardingTypeJobs,
		OnboardingTypeNamespaces,
		OnboardingTypeClusters,
		OnboardingTypeVolumes,
	}
}

var ValidOnboardingTypes = []OnboardingType{
	OnboardingTypeHosts,
	OnboardingTypeProcesses,
	OnboardingTypePods,
	OnboardingTypeNodes,
	OnboardingTypeDeployments,
	OnboardingTypeDaemonsets,
	OnboardingTypeStatefulsets,
	OnboardingTypeJobs,
	OnboardingTypeNamespaces,
	OnboardingTypeClusters,
	OnboardingTypeVolumes,
}

// OnboardingComponentType tags each AssociatedComponent as either a receiver or a processor.
// Only these two values are ever written by the module.
type OnboardingComponentType struct {
	valuer.String
}

var (
	OnboardingComponentTypeReceiver  = OnboardingComponentType{valuer.NewString("receiver")}
	OnboardingComponentTypeProcessor = OnboardingComponentType{valuer.NewString("processor")}
)

func (OnboardingComponentType) Enum() []any {
	return []any{
		OnboardingComponentTypeReceiver,
		OnboardingComponentTypeProcessor,
	}
}
