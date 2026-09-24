import getLocalStorage from 'api/browser/localstorage/get';
import {
	InframonitoringtypesChecksDTO,
	InframonitoringtypesCheckTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { InfraMonitoringEntity } from '../../../constants';

export const ENTITY_TO_CHECK_TYPE: Record<
	InfraMonitoringEntity,
	InframonitoringtypesCheckTypeDTO
> = {
	[InfraMonitoringEntity.HOSTS]: InframonitoringtypesCheckTypeDTO.hosts,
	[InfraMonitoringEntity.PODS]: InframonitoringtypesCheckTypeDTO.pods,
	[InfraMonitoringEntity.NODES]: InframonitoringtypesCheckTypeDTO.nodes,
	[InfraMonitoringEntity.NAMESPACES]:
		InframonitoringtypesCheckTypeDTO.namespaces,
	[InfraMonitoringEntity.CLUSTERS]: InframonitoringtypesCheckTypeDTO.clusters,
	[InfraMonitoringEntity.DEPLOYMENTS]:
		InframonitoringtypesCheckTypeDTO.deployments,
	[InfraMonitoringEntity.STATEFULSETS]:
		InframonitoringtypesCheckTypeDTO.statefulsets,
	[InfraMonitoringEntity.DAEMONSETS]:
		InframonitoringtypesCheckTypeDTO.daemonsets,
	[InfraMonitoringEntity.JOBS]: InframonitoringtypesCheckTypeDTO.jobs,
	[InfraMonitoringEntity.VOLUMES]: InframonitoringtypesCheckTypeDTO.volumes,
	[InfraMonitoringEntity.CONTAINERS]:
		InframonitoringtypesCheckTypeDTO.kube_containers,
};

export function hasMissingEntries(
	data: InframonitoringtypesChecksDTO,
): boolean {
	return (
		(data.missingDefaultEnabledMetrics?.length ?? 0) > 0 ||
		(data.missingOptionalMetrics?.length ?? 0) > 0 ||
		(data.missingRequiredAttributes?.length ?? 0) > 0
	);
}

export function hasAnyEntries(data: InframonitoringtypesChecksDTO): boolean {
	return (
		(data.presentDefaultEnabledMetrics?.length ?? 0) > 0 ||
		(data.presentOptionalMetrics?.length ?? 0) > 0 ||
		(data.presentRequiredAttributes?.length ?? 0) > 0 ||
		(data.missingDefaultEnabledMetrics?.length ?? 0) > 0 ||
		(data.missingOptionalMetrics?.length ?? 0) > 0 ||
		(data.missingRequiredAttributes?.length ?? 0) > 0
	);
}

const STORAGE_PREFIX = '@signozhq/k8s-instrumentation-checks-expanded';

export function getStorageKey(entity: InfraMonitoringEntity): string {
	return `${STORAGE_PREFIX}-${entity}`;
}

export function readExpandedState(entity: InfraMonitoringEntity): boolean {
	const stored = getLocalStorage(getStorageKey(entity));
	return stored === null ? true : stored === 'true';
}
