import { InfraMonitoringEntity } from '../constants';

/**
 * Categories whose records can be filtered by a given category's identity
 * expression (see `getSelectedItemExpression`). A pair is listed only when the
 * target's metrics carry the source's identity attributes — pod metrics carry
 * cluster/namespace/node and the workload names, container metrics carry the
 * pod UID, volume metrics carry only cluster/namespace.
 */
const RELATED_CATEGORIES: Partial<
	Record<InfraMonitoringEntity, InfraMonitoringEntity[]>
> = {
	[InfraMonitoringEntity.CLUSTERS]: [
		InfraMonitoringEntity.PODS,
		InfraMonitoringEntity.NODES,
		InfraMonitoringEntity.NAMESPACES,
		InfraMonitoringEntity.DEPLOYMENTS,
		InfraMonitoringEntity.STATEFULSETS,
		InfraMonitoringEntity.DAEMONSETS,
		InfraMonitoringEntity.JOBS,
		InfraMonitoringEntity.VOLUMES,
		InfraMonitoringEntity.CONTAINERS,
	],
	[InfraMonitoringEntity.NAMESPACES]: [
		InfraMonitoringEntity.PODS,
		InfraMonitoringEntity.DEPLOYMENTS,
		InfraMonitoringEntity.STATEFULSETS,
		InfraMonitoringEntity.DAEMONSETS,
		InfraMonitoringEntity.JOBS,
		InfraMonitoringEntity.VOLUMES,
		InfraMonitoringEntity.CONTAINERS,
	],
	[InfraMonitoringEntity.NODES]: [
		InfraMonitoringEntity.PODS,
		InfraMonitoringEntity.CONTAINERS,
	],
	[InfraMonitoringEntity.DEPLOYMENTS]: [InfraMonitoringEntity.PODS],
	[InfraMonitoringEntity.STATEFULSETS]: [InfraMonitoringEntity.PODS],
	[InfraMonitoringEntity.DAEMONSETS]: [InfraMonitoringEntity.PODS],
	[InfraMonitoringEntity.JOBS]: [InfraMonitoringEntity.PODS],
	[InfraMonitoringEntity.PODS]: [InfraMonitoringEntity.CONTAINERS],
};

export function getRelatedCategories(
	category: InfraMonitoringEntity,
): InfraMonitoringEntity[] {
	return RELATED_CATEGORIES[category] ?? [];
}

export function resolveRelatedCategory(
	category: InfraMonitoringEntity,
	requested: string | null,
): InfraMonitoringEntity | null {
	const related = getRelatedCategories(category);
	const match = related.find((target) => target === requested);

	return match ?? related[0] ?? null;
}
