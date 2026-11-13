import { hostColumnsConfig } from 'container/InfraMonitoringHostsV2/table.config';

import { k8sClustersColumnsConfig } from '../Clusters/table.config';
import {
	ENTITY_FILTER_PLACEHOLDERS,
	InfraMonitoringEntity,
	METRIC_NAMESPACE_BY_ENTITY,
} from '../constants';
import { k8sDaemonSetsColumnsConfig } from '../DaemonSets/table.config';
import { k8sDeploymentsColumnsConfig } from '../Deployments/table.config';
import { k8sJobsColumnsConfig } from '../Jobs/table.config';
import { k8sNamespacesColumnsConfig } from '../Namespaces/table.config';
import { k8sNodesColumnsConfig } from '../Nodes/table.config';
import { k8sPodColumnsConfig } from '../Pods/table.config';
import { k8sStatefulSetsColumnsConfig } from '../StatefulSets/table.config';
import { k8sVolumesColumnsConfig } from '../Volumes/table.config';

/**
 * The per-entity config, asserted from the source rather than through a browser.
 *
 * `K8sBaseList` and `K8sBaseDetails` do not branch on entity — the only thing
 * that varies between the ten is the config object they are handed. So the
 * question "is entity N wired up correctly" is a property of these literals, and
 * running the same rendered list ten times over a seeded stack answers it at
 * about a thousand times the cost. The E2E suite drives one entity; this is what
 * covers the other nine.
 */

interface EntityConfig {
	entity: InfraMonitoringEntity;
	/** The column whose id is the entity's name attribute. */
	nameColumnId: string;
	/** The group-row column, which every entity renders first and pins left. */
	groupColumnId: string;
	columns: { id: string; enableSort?: boolean; pin?: string }[];
}

const ENTITIES: EntityConfig[] = [
	{
		entity: InfraMonitoringEntity.HOSTS,
		nameColumnId: 'host.name',
		groupColumnId: 'hostGroup',
		columns: hostColumnsConfig,
	},
	{
		entity: InfraMonitoringEntity.PODS,
		nameColumnId: 'k8s.pod.name',
		groupColumnId: 'podGroup',
		columns: k8sPodColumnsConfig,
	},
	{
		entity: InfraMonitoringEntity.NODES,
		nameColumnId: 'k8s.node.name',
		groupColumnId: 'nodeGroup',
		columns: k8sNodesColumnsConfig,
	},
	{
		entity: InfraMonitoringEntity.NAMESPACES,
		nameColumnId: 'k8s.namespace.name',
		groupColumnId: 'namespaceGroup',
		columns: k8sNamespacesColumnsConfig,
	},
	{
		entity: InfraMonitoringEntity.CLUSTERS,
		nameColumnId: 'k8s.cluster.name',
		groupColumnId: 'clusterGroup',
		columns: k8sClustersColumnsConfig,
	},
	{
		entity: InfraMonitoringEntity.DEPLOYMENTS,
		nameColumnId: 'k8s.deployment.name',
		groupColumnId: 'deploymentGroup',
		columns: k8sDeploymentsColumnsConfig,
	},
	{
		entity: InfraMonitoringEntity.STATEFULSETS,
		nameColumnId: 'k8s.statefulset.name',
		groupColumnId: 'statefulSetGroup',
		columns: k8sStatefulSetsColumnsConfig,
	},
	{
		entity: InfraMonitoringEntity.DAEMONSETS,
		nameColumnId: 'k8s.daemonset.name',
		groupColumnId: 'daemonSetGroup',
		columns: k8sDaemonSetsColumnsConfig,
	},
	{
		entity: InfraMonitoringEntity.JOBS,
		nameColumnId: 'k8s.job.name',
		groupColumnId: 'jobGroup',
		columns: k8sJobsColumnsConfig,
	},
	{
		entity: InfraMonitoringEntity.VOLUMES,
		nameColumnId: 'k8s.persistentvolumeclaim.name',
		groupColumnId: 'volumeGroup',
		columns: k8sVolumesColumnsConfig,
	},
];

describe('infra monitoring entity config', () => {
	it.each(ENTITIES)(
		'$entity has a filter placeholder and a metric namespace',
		({ entity }) => {
			// A missing placeholder renders an empty search box; a missing namespace
			// makes the field-suggestion calls return everything.
			expect(ENTITY_FILTER_PLACEHOLDERS[entity]).toMatch(
				/^Enter your filter query/,
			);
			expect(METRIC_NAMESPACE_BY_ENTITY[entity]).toMatch(/\.$/);
		},
	);

	it.each(ENTITIES)(
		'$entity has unique, non-empty column ids',
		({ columns }) => {
			const ids = columns.map((column) => column.id);
			expect(ids.every(Boolean)).toBe(true);
			// A duplicate id makes TanStack drop one of the columns silently, and the
			// persisted hidden/order state then addresses the wrong one.
			expect(new Set(ids).size).toBe(ids.length);
		},
	);

	it.each(ENTITIES)(
		'$entity pins its group and name columns left',
		({ columns, groupColumnId, nameColumnId }) => {
			// Both are `pin: 'left'` so they survive a horizontal scroll; the group
			// column is also what the expand chevron lives in.
			const byId = new Map(columns.map((column) => [column.id, column]));
			expect(byId.get(groupColumnId)?.pin).toBe('left');
			expect(byId.get(nameColumnId)?.pin).toBe('left');
		},
	);

	it.each(ENTITIES)(
		'$entity sorts by its name column and not by its group column',
		({ columns, groupColumnId, nameColumnId }) => {
			const byId = new Map(columns.map((column) => [column.id, column]));
			expect(byId.get(nameColumnId)?.enableSort).toBe(true);
			// The group column holds an aggregate, so there is nothing to sort by.
			expect(byId.get(groupColumnId)?.enableSort).toBe(false);
		},
	);

	it('every entity with a config is covered here', () => {
		// Containers is in the enum with fixtures behind it, but has no entity
		// config and no tab yet — the day it ships, this fails.
		const covered = new Set(ENTITIES.map(({ entity }) => entity));
		const missing = Object.values(InfraMonitoringEntity).filter(
			(entity) => !covered.has(entity),
		);
		expect(missing).toStrictEqual([InfraMonitoringEntity.CONTAINERS]);
	});
});
