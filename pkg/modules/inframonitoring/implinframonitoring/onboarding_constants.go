package implinframonitoring

import "github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"

// Component names — the 5 OTel collector receivers/processors that produce
// metrics and resource attributes consumed by infra-monitoring tabs. Bare
// strings on purpose (not wrapped enums) — the list is open-ended enough that
// an enum adds more friction than value.
const (
	componentNameHostMetricsReceiver        = "hostmetricsreceiver"
	componentNameKubeletStatsReceiver       = "kubeletstatsreceiver"
	componentNameK8sClusterReceiver         = "k8sclusterreceiver"
	componentNameResourceDetectionProcessor = "resourcedetectionprocessor"
	componentNameK8sAttributesProcessor     = "k8sattributesprocessor"
)

// Documentation links — one per component. User-facing; emitted on missing-entries.
const (
	docLinkHostMetricsReceiver        = "https://signoz.io/docs/infrastructure-monitoring/hostmetrics/#step-2-configure-the-collector"
	docLinkKubeletStatsReceiver       = "https://signoz.io/docs/infrastructure-monitoring/k8s-metrics/#setting-up-kubelet-stats-monitoring"
	docLinkK8sClusterReceiver         = "https://signoz.io/docs/infrastructure-monitoring/k8s-metrics/#setting-up-k8s-cluster-monitoring"
	docLinkResourceDetectionProcessor = "https://signoz.io/docs/infrastructure-monitoring/hostmetrics/#host-name-is-blankempty"
	docLinkK8sAttributesProcessor     = "https://signoz.io/docs/infrastructure-monitoring/k8s-metrics/#2-enable-kubernetes-metadata"
)

var (
	componentHostMetricsReceiver = inframonitoringtypes.AssociatedComponent{
		Type: inframonitoringtypes.OnboardingComponentTypeReceiver,
		Name: componentNameHostMetricsReceiver,
	}
	componentKubeletStatsReceiver = inframonitoringtypes.AssociatedComponent{
		Type: inframonitoringtypes.OnboardingComponentTypeReceiver,
		Name: componentNameKubeletStatsReceiver,
	}
	componentK8sClusterReceiver = inframonitoringtypes.AssociatedComponent{
		Type: inframonitoringtypes.OnboardingComponentTypeReceiver,
		Name: componentNameK8sClusterReceiver,
	}
	componentResourceDetectionProcessor = inframonitoringtypes.AssociatedComponent{
		Type: inframonitoringtypes.OnboardingComponentTypeProcessor,
		Name: componentNameResourceDetectionProcessor,
	}
	componentK8sAttributesProcessor = inframonitoringtypes.AssociatedComponent{
		Type: inframonitoringtypes.OnboardingComponentTypeProcessor,
		Name: componentNameK8sAttributesProcessor,
	}
)

// onboardingSpecs is the single lookup table the module consults for a type's
// readiness contract. Every OnboardingType value must have an entry here.
var onboardingSpecs = map[inframonitoringtypes.OnboardingType]onboardingSpec{
	inframonitoringtypes.OnboardingTypeHosts:        hostsSpec,
	inframonitoringtypes.OnboardingTypeProcesses:    processesSpec,
	inframonitoringtypes.OnboardingTypePods:         podsSpec,
	inframonitoringtypes.OnboardingTypeNodes:        nodesSpec,
	inframonitoringtypes.OnboardingTypeDeployments:  deploymentsSpec,
	inframonitoringtypes.OnboardingTypeDaemonsets:   daemonsetsSpec,
	inframonitoringtypes.OnboardingTypeStatefulsets: statefulsetsSpec,
	inframonitoringtypes.OnboardingTypeJobs:         jobsSpec,
	inframonitoringtypes.OnboardingTypeNamespaces:   namespacesSpec,
	inframonitoringtypes.OnboardingTypeClusters:     clustersSpec,
	inframonitoringtypes.OnboardingTypeVolumes:      volumesSpec,
}

// Per-type specs. Every metric and attribute is spelled out in its own spec
// on purpose — no shared slices, no concatenation helpers. Repetition is
// cheaper than indirection when auditing what each tab actually requires.

var hostsSpec = onboardingSpec{
	Buckets: []onboardingComponentBucket{
		{
			Component: componentHostMetricsReceiver,
			DefaultMetrics: []string{
				"system.cpu.time",
				"system.memory.usage",
				"system.cpu.load_average.15m",
				"system.filesystem.usage",
			},
			DocumentationLink: docLinkHostMetricsReceiver,
		},
		{
			Component:         componentResourceDetectionProcessor,
			RequiredAttrs:     []string{"host.name"},
			DocumentationLink: docLinkResourceDetectionProcessor,
		},
	},
}

var processesSpec = onboardingSpec{
	Buckets: []onboardingComponentBucket{
		{
			Component: componentHostMetricsReceiver,
			DefaultMetrics: []string{
				"process.cpu.time",
				"process.memory.usage",
			},
			RequiredAttrs:     []string{"process.pid"},
			DocumentationLink: docLinkHostMetricsReceiver,
		},
	},
}

var podsSpec = onboardingSpec{
	Buckets: []onboardingComponentBucket{
		{
			Component: componentKubeletStatsReceiver,
			DefaultMetrics: []string{
				"k8s.pod.cpu.usage",
				"k8s.pod.memory.working_set",
			},
			OptionalMetrics: []string{
				"k8s.pod.cpu_request_utilization",
				"k8s.pod.cpu_limit_utilization",
				"k8s.pod.memory_request_utilization",
				"k8s.pod.memory_limit_utilization",
			},
			DocumentationLink: docLinkKubeletStatsReceiver,
		},
		{
			Component:         componentK8sClusterReceiver,
			DefaultMetrics:    []string{"k8s.pod.phase"},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.pod.uid"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
	},
}

var nodesSpec = onboardingSpec{
	Buckets: []onboardingComponentBucket{
		{
			Component: componentKubeletStatsReceiver,
			DefaultMetrics: []string{
				"k8s.node.cpu.usage",
				"k8s.node.memory.working_set",
			},
			DocumentationLink: docLinkKubeletStatsReceiver,
		},
		{
			Component: componentK8sClusterReceiver,
			DefaultMetrics: []string{
				"k8s.node.allocatable_cpu",
				"k8s.node.allocatable_memory", // k8s.node.allocatable_cpu and k8s.node.allocatable_memory are
				// controlled by allocatable_types_to_report config option (Check // https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/4f9a578b210a6dcb9f9bf47942f27208b5765298/receiver/k8sclusterreceiver/metadata.yaml#L805-L806)
				"k8s.node.condition_ready", // # k8s.node.condition_* metrics (k8s.node.condition_ready, k8s.node.condition_memory_pressure, etc) are controlled# by node_conditions_to_report config option.
				//  By default, only k8s.node.condition_ready is enabled. (Check https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/4f9a578b210a6dcb9f9bf47942f27208b5765298/receiver/k8sclusterreceiver/metadata.yaml#L802)
			},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.node.name"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
	},
}

var deploymentsSpec = onboardingSpec{
	Buckets: []onboardingComponentBucket{
		{
			Component: componentKubeletStatsReceiver,
			DefaultMetrics: []string{
				"k8s.pod.cpu.usage",
				"k8s.pod.memory.working_set",
			},
			OptionalMetrics: []string{
				"k8s.pod.cpu_request_utilization",
				"k8s.pod.cpu_limit_utilization",
				"k8s.pod.memory_request_utilization",
				"k8s.pod.memory_limit_utilization",
			},
			DocumentationLink: docLinkKubeletStatsReceiver,
		},
		{
			Component: componentK8sClusterReceiver,
			DefaultMetrics: []string{
				"k8s.container.restarts",
				"k8s.deployment.desired",
				"k8s.deployment.available",
			},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.deployment.name"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
	},
}

var daemonsetsSpec = onboardingSpec{
	Buckets: []onboardingComponentBucket{
		{
			Component: componentKubeletStatsReceiver,
			DefaultMetrics: []string{
				"k8s.pod.cpu.usage",
				"k8s.pod.memory.working_set",
			},
			OptionalMetrics: []string{
				"k8s.pod.cpu_request_utilization",
				"k8s.pod.cpu_limit_utilization",
				"k8s.pod.memory_request_utilization",
				"k8s.pod.memory_limit_utilization",
			},
			DocumentationLink: docLinkKubeletStatsReceiver,
		},
		{
			Component: componentK8sClusterReceiver,
			DefaultMetrics: []string{
				"k8s.container.restarts",
				"k8s.daemonset.desired_scheduled_nodes",
				"k8s.daemonset.current_scheduled_nodes",
			},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.daemonset.name"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
	},
}

var statefulsetsSpec = onboardingSpec{
	Buckets: []onboardingComponentBucket{
		{
			Component: componentKubeletStatsReceiver,
			DefaultMetrics: []string{
				"k8s.pod.cpu.usage",
				"k8s.pod.memory.working_set",
			},
			OptionalMetrics: []string{
				"k8s.pod.cpu_request_utilization",
				"k8s.pod.cpu_limit_utilization",
				"k8s.pod.memory_request_utilization",
				"k8s.pod.memory_limit_utilization",
			},
			DocumentationLink: docLinkKubeletStatsReceiver,
		},
		{
			Component: componentK8sClusterReceiver,
			DefaultMetrics: []string{
				"k8s.container.restarts",
				"k8s.statefulset.desired_pods",
				"k8s.statefulset.current_pods",
			},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.statefulset.name"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
	},
}

var jobsSpec = onboardingSpec{
	Buckets: []onboardingComponentBucket{
		{
			Component: componentKubeletStatsReceiver,
			DefaultMetrics: []string{
				"k8s.pod.cpu.usage",
				"k8s.pod.memory.working_set",
			},
			OptionalMetrics: []string{
				"k8s.pod.cpu_request_utilization",
				"k8s.pod.cpu_limit_utilization",
				"k8s.pod.memory_request_utilization",
				"k8s.pod.memory_limit_utilization",
			},
			DocumentationLink: docLinkKubeletStatsReceiver,
		},
		{
			Component: componentK8sClusterReceiver,
			DefaultMetrics: []string{
				"k8s.container.restarts",
				"k8s.job.desired_successful_pods",
				"k8s.job.active_pods",
				"k8s.job.failed_pods",
				"k8s.job.successful_pods",
			},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.job.name"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
	},
}

var namespacesSpec = onboardingSpec{
	Buckets: []onboardingComponentBucket{
		{
			Component: componentKubeletStatsReceiver,
			DefaultMetrics: []string{
				"k8s.pod.cpu.usage",
				"k8s.pod.memory.working_set",
			},
			DocumentationLink: docLinkKubeletStatsReceiver,
		},
		{
			Component:         componentK8sClusterReceiver,
			DefaultMetrics:    []string{"k8s.pod.phase"},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.namespace.name"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
	},
}

var clustersSpec = onboardingSpec{
	Buckets: []onboardingComponentBucket{
		{
			Component: componentKubeletStatsReceiver,
			DefaultMetrics: []string{
				"k8s.node.cpu.usage",
				"k8s.node.memory.working_set",
			},
			DocumentationLink: docLinkKubeletStatsReceiver,
		},
		{
			Component: componentK8sClusterReceiver,
			DefaultMetrics: []string{
				"k8s.node.allocatable_cpu",
				"k8s.node.allocatable_memory", //k8s.node.allocatable_cpu and k8s.node.allocatable_memory are
				// controlled by allocatable_types_to_report config option (Check // https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/4f9a578b210a6dcb9f9bf47942f27208b5765298/receiver/k8sclusterreceiver/metadata.yaml#L805-L806)
			},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentResourceDetectionProcessor,
			RequiredAttrs:     []string{"k8s.cluster.name"},
			DocumentationLink: docLinkResourceDetectionProcessor,
		},
	},
}

var volumesSpec = onboardingSpec{
	Buckets: []onboardingComponentBucket{
		{
			Component: componentKubeletStatsReceiver,
			DefaultMetrics: []string{
				"k8s.volume.available",
				"k8s.volume.capacity",
				"k8s.volume.inodes",
				"k8s.volume.inodes.free",
				"k8s.volume.inodes.used",
			},
			DocumentationLink: docLinkKubeletStatsReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.persistentvolumeclaim.name"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
	},
}
