import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';

// TODO(H4ad): drop this once v2 is merged
export const METRIC_NAMESPACE_BY_ENTITY: Record<InfraMonitoringEntity, string> =
	{
		[InfraMonitoringEntity.HOSTS]: 'system.',
		[InfraMonitoringEntity.PODS]: 'k8s.pod.',
		[InfraMonitoringEntity.NODES]: 'k8s.node.',
		[InfraMonitoringEntity.NAMESPACES]: 'k8s.pod.',
		[InfraMonitoringEntity.CLUSTERS]: 'k8s.node.',
		[InfraMonitoringEntity.DEPLOYMENTS]: 'k8s.pod.',
		[InfraMonitoringEntity.STATEFULSETS]: 'k8s.pod.',
		[InfraMonitoringEntity.DAEMONSETS]: 'k8s.pod.',
		[InfraMonitoringEntity.CONTAINERS]: 'k8s.pod.',
		[InfraMonitoringEntity.JOBS]: 'k8s.pod.',
		[InfraMonitoringEntity.VOLUMES]: 'k8s.volume.',
	};
