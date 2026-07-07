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
	docLinkHostMetricsReceiver        = "https://signoz.io/docs/infrastructure-monitoring/user-guides/hostmetrics/#configure-the-hostmetrics-receiver"
	docLinkKubeletStatsReceiver       = "https://signoz.io/docs/infrastructure-monitoring/user-guides/k8s-metrics/#setup-kubelet-stats-receiver"
	docLinkK8sClusterReceiver         = "https://signoz.io/docs/infrastructure-monitoring/user-guides/k8s-metrics/#setup-k8s-cluster-receiver"
	docLinkResourceDetectionProcessor = "https://signoz.io/docs/infrastructure-monitoring/user-guides/hostmetrics/#configure-the-resourcedetection-processor"
	docLinkK8sAttributesProcessor     = "https://signoz.io/docs/infrastructure-monitoring/user-guides/k8s-metrics/#3-setup-k8sattributesprocessor-to-enable-kubernetes-metadata"
)

var (
	componentHostMetricsReceiver = inframonitoringtypes.AssociatedComponent{
		Type: inframonitoringtypes.CheckComponentTypeReceiver,
		Name: componentNameHostMetricsReceiver,
	}
	componentKubeletStatsReceiver = inframonitoringtypes.AssociatedComponent{
		Type: inframonitoringtypes.CheckComponentTypeReceiver,
		Name: componentNameKubeletStatsReceiver,
	}
	componentK8sClusterReceiver = inframonitoringtypes.AssociatedComponent{
		Type: inframonitoringtypes.CheckComponentTypeReceiver,
		Name: componentNameK8sClusterReceiver,
	}
	componentResourceDetectionProcessor = inframonitoringtypes.AssociatedComponent{
		Type: inframonitoringtypes.CheckComponentTypeProcessor,
		Name: componentNameResourceDetectionProcessor,
	}
	componentK8sAttributesProcessor = inframonitoringtypes.AssociatedComponent{
		Type: inframonitoringtypes.CheckComponentTypeProcessor,
		Name: componentNameK8sAttributesProcessor,
	}
)

// checkSpecs is the single lookup table the module consults for a type's
// readiness contract. Every CheckType value must have an entry here.
var checkSpecs = map[inframonitoringtypes.CheckType]checkSpec{
	inframonitoringtypes.CheckTypeHosts:        hostsSpec,
	inframonitoringtypes.CheckTypeProcesses:    processesSpec,
	inframonitoringtypes.CheckTypePods:         podsSpec,
	inframonitoringtypes.CheckTypeNodes:        nodesSpec,
	inframonitoringtypes.CheckTypeDeployments:  deploymentsSpec,
	inframonitoringtypes.CheckTypeDaemonsets:   daemonsetsSpec,
	inframonitoringtypes.CheckTypeStatefulsets: statefulsetsSpec,
	inframonitoringtypes.CheckTypeJobs:         jobsSpec,
	inframonitoringtypes.CheckTypeNamespaces:   namespacesSpec,
	inframonitoringtypes.CheckTypeClusters:     clustersSpec,
	inframonitoringtypes.CheckTypeVolumes:      volumesSpec,
}

// Per-type specs. Every metric and attribute is spelled out in its own spec
// on purpose — no shared slices, no concatenation helpers. Repetition is
// cheaper than indirection when auditing what each tab actually requires.

var hostsSpec = checkSpec{
	Buckets: []checkComponentBucket{
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

var processesSpec = checkSpec{
	Buckets: []checkComponentBucket{
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

var podsSpec = checkSpec{
	Buckets: []checkComponentBucket{
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
				"k8s.pod.phase",
				"k8s.container.restarts", // pod restart count (default-on)
			},
			OptionalMetrics: []string{
				// kubectl-style pod display status (default-off in the receiver).
				"k8s.pod.status_reason",
				"k8s.container.status.reason",
			},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.pod.uid"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
	},
}

var nodesSpec = checkSpec{
	Buckets: []checkComponentBucket{
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
				"k8s.pod.phase", // pod counts per node by phase
			},
			OptionalMetrics: []string{
				"k8s.pod.status_reason",
				"k8s.container.status.reason",
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

var deploymentsSpec = checkSpec{
	Buckets: []checkComponentBucket{
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
				"k8s.pod.phase",
				"k8s.deployment.desired",
				"k8s.deployment.available",
			},
			OptionalMetrics: []string{
				"k8s.pod.status_reason",
				"k8s.container.status.reason",
			},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.deployment.name", "k8s.namespace.name"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
		{
			Component:         componentResourceDetectionProcessor,
			RequiredAttrs:     []string{"k8s.cluster.name"},
			DocumentationLink: docLinkResourceDetectionProcessor,
		},
	},
}

var daemonsetsSpec = checkSpec{
	Buckets: []checkComponentBucket{
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
				"k8s.pod.phase",
				"k8s.daemonset.desired_scheduled_nodes",
				"k8s.daemonset.current_scheduled_nodes",
			},
			OptionalMetrics: []string{
				"k8s.pod.status_reason",
				"k8s.container.status.reason",
			},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.daemonset.name", "k8s.namespace.name"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
		{
			Component:         componentResourceDetectionProcessor,
			RequiredAttrs:     []string{"k8s.cluster.name"},
			DocumentationLink: docLinkResourceDetectionProcessor,
		},
	},
}

var statefulsetsSpec = checkSpec{
	Buckets: []checkComponentBucket{
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
				"k8s.pod.phase",
				"k8s.statefulset.desired_pods",
				"k8s.statefulset.current_pods",
			},
			OptionalMetrics: []string{
				"k8s.pod.status_reason",
				"k8s.container.status.reason",
			},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.statefulset.name", "k8s.namespace.name"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
		{
			Component:         componentResourceDetectionProcessor,
			RequiredAttrs:     []string{"k8s.cluster.name"},
			DocumentationLink: docLinkResourceDetectionProcessor,
		},
	},
}

var jobsSpec = checkSpec{
	Buckets: []checkComponentBucket{
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
				"k8s.pod.phase",
				"k8s.job.desired_successful_pods",
				"k8s.job.active_pods",
				"k8s.job.failed_pods",
				"k8s.job.successful_pods",
			},
			OptionalMetrics: []string{
				"k8s.pod.status_reason",
				"k8s.container.status.reason",
			},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.job.name", "k8s.namespace.name"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
		{
			Component:         componentResourceDetectionProcessor,
			RequiredAttrs:     []string{"k8s.cluster.name"},
			DocumentationLink: docLinkResourceDetectionProcessor,
		},
	},
}

var namespacesSpec = checkSpec{
	Buckets: []checkComponentBucket{
		{
			Component: componentKubeletStatsReceiver,
			DefaultMetrics: []string{
				"k8s.pod.cpu.usage",
				"k8s.pod.memory.working_set",
			},
			DocumentationLink: docLinkKubeletStatsReceiver,
		},
		{
			Component:      componentK8sClusterReceiver,
			DefaultMetrics: []string{"k8s.pod.phase"},
			OptionalMetrics: []string{
				"k8s.pod.status_reason",
				"k8s.container.status.reason",
			},
			DocumentationLink: docLinkK8sClusterReceiver,
		},
		{
			Component:         componentK8sAttributesProcessor,
			RequiredAttrs:     []string{"k8s.namespace.name"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
		{
			Component:         componentResourceDetectionProcessor,
			RequiredAttrs:     []string{"k8s.cluster.name"},
			DocumentationLink: docLinkResourceDetectionProcessor,
		},
	},
}

var clustersSpec = checkSpec{
	Buckets: []checkComponentBucket{
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
				"k8s.node.condition_ready", // node counts by readiness
				"k8s.pod.phase",            // pod counts per cluster by phase
			},
			OptionalMetrics: []string{
				"k8s.pod.status_reason",
				"k8s.container.status.reason",
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

var volumesSpec = checkSpec{
	Buckets: []checkComponentBucket{
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
			RequiredAttrs:     []string{"k8s.persistentvolumeclaim.name", "k8s.namespace.name"},
			DocumentationLink: docLinkK8sAttributesProcessor,
		},
		{
			Component:         componentResourceDetectionProcessor,
			RequiredAttrs:     []string{"k8s.cluster.name"},
			DocumentationLink: docLinkResourceDetectionProcessor,
		},
	},
}
