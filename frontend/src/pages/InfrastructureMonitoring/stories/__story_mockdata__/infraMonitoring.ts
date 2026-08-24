import {
	type InframonitoringtypesAssociatedComponentDTO,
	InframonitoringtypesCheckComponentTypeDTO,
	InframonitoringtypesCheckTypeDTO,
	type InframonitoringtypesChecksDTO,
	type InframonitoringtypesClusterRecordDTO,
	type InframonitoringtypesDaemonSetRecordDTO,
	type InframonitoringtypesDeploymentRecordDTO,
	type InframonitoringtypesHostRecordDTO,
	InframonitoringtypesHostStatusDTO,
	type InframonitoringtypesJobRecordDTO,
	type InframonitoringtypesNamespaceRecordDTO,
	InframonitoringtypesNodeConditionDTO,
	type InframonitoringtypesNodeRecordDTO,
	type InframonitoringtypesPodCountsByStatusDTO,
	type InframonitoringtypesPodRecordDTO,
	InframonitoringtypesPodStatusDTO,
	InframonitoringtypesResponseTypeDTO,
	type InframonitoringtypesStatefulSetRecordDTO,
	type InframonitoringtypesVolumeRecordDTO,
	type Querybuildertypesv5QueryWarnDataDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from 'container/InfraMonitoringK8sV2/constants';
import type { RawRow } from 'types/api/v5/queryRange';

export const INFRA_TABS = ['hosts', 'kubernetes'] as const;

export type InfraTab = (typeof INFRA_TABS)[number];

/** The nine entities `entityRegistry` registers under the `category` param. */
export const K8S_CATEGORIES = [
	InfraMonitoringEntity.PODS,
	InfraMonitoringEntity.NODES,
	InfraMonitoringEntity.NAMESPACES,
	InfraMonitoringEntity.CLUSTERS,
	InfraMonitoringEntity.DEPLOYMENTS,
	InfraMonitoringEntity.JOBS,
	InfraMonitoringEntity.DAEMONSETS,
	InfraMonitoringEntity.STATEFULSETS,
	InfraMonitoringEntity.VOLUMES,
] as const;

export type K8sCategory = (typeof K8S_CATEGORIES)[number];

export type InfraEntity = K8sCategory | InfraMonitoringEntity.HOSTS;

/** Volumes are the one entity whose path segment is not its category name. */
const RESOURCE_BY_ENTITY: Record<InfraEntity, string> = {
	[InfraMonitoringEntity.HOSTS]: 'hosts',
	[InfraMonitoringEntity.PODS]: 'pods',
	[InfraMonitoringEntity.NODES]: 'nodes',
	[InfraMonitoringEntity.NAMESPACES]: 'namespaces',
	[InfraMonitoringEntity.CLUSTERS]: 'clusters',
	[InfraMonitoringEntity.DEPLOYMENTS]: 'deployments',
	[InfraMonitoringEntity.JOBS]: 'jobs',
	[InfraMonitoringEntity.DAEMONSETS]: 'daemonsets',
	[InfraMonitoringEntity.STATEFULSETS]: 'statefulsets',
	[InfraMonitoringEntity.VOLUMES]: 'pvcs',
};

const ENTITY_BY_RESOURCE = new Map(
	Object.entries(RESOURCE_BY_ENTITY).map(([entity, resource]) => [
		resource,
		entity as InfraEntity,
	]),
);

export const entityForResource = (resource: string): InfraEntity | undefined =>
	ENTITY_BY_RESOURCE.get(resource);

const CLUSTERS = ['prod-us-east-1', 'prod-eu-west-1', 'staging-us-east-1'];
const NAMESPACES = ['default', 'signoz', 'kube-system', 'payments'];
const NODES = ['ip-10-0-1-24', 'ip-10-0-2-88', 'ip-10-0-3-17'];
const ENVIRONMENTS = ['production', 'production', 'staging'];
const OS_TYPES = ['linux', 'linux', 'darwin'];
const WORKLOADS = [
	'checkout',
	'frontend',
	'query-service',
	'otel-collector',
	'redis',
	'cart',
	'payments',
	'recommendation',
	'shipping',
	'ad-service',
	'currency',
	'email',
];

const pick = <T>(pool: readonly T[], index: number): T =>
	pool[index % pool.length];

/** Stable pseudo-noise in `[0, 1)`, so a re-render redraws the same numbers. */
const fraction = (index: number, seed: number): number =>
	(((index + 1) * 37 + seed * 13) % 97) / 97;

const HOUR_MS = 60 * 60 * 1000;
const MIB = 1024 * 1024;
const GIB = 1024 * MIB;

/** Working-set bytes, the unit the memory columns run through `formatBytes`. */
const bytes = (index: number, seed: number, scaleGib = 1): number =>
	Math.round((0.2 + fraction(index, seed) * 0.8) * scaleGib * GIB);

/** CPU cores, the unit the usage columns print with two decimals. */
const cores = (index: number, seed: number, scale = 1): number =>
	(0.2 + fraction(index, seed) * 3.5) * scale;

const POD_STATUS_ZEROES: InframonitoringtypesPodCountsByStatusDTO = {
	completed: 0,
	containerCannotRun: 0,
	containerCreating: 0,
	crashLoopBackOff: 0,
	createContainerConfigError: 0,
	errImagePull: 0,
	error: 0,
	evicted: 0,
	failed: 0,
	imagePullBackOff: 0,
	nodeAffinity: 0,
	nodeLost: 0,
	oomKilled: 0,
	pending: 0,
	running: 0,
	shutdown: 0,
	unexpectedAdmissionError: 0,
	unknown: 0,
};

const podCounts = (
	counts: Partial<InframonitoringtypesPodCountsByStatusDTO>,
): InframonitoringtypesPodCountsByStatusDTO => ({
	...POD_STATUS_ZEROES,
	...counts,
});

const workloadMeta = (index: number): Record<string, string> => ({
	[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME]: pick(CLUSTERS, index),
	[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME]: pick(NAMESPACES, index),
	[INFRA_MONITORING_ATTR_KEYS.DEPLOYMENT_ENVIRONMENT]: pick(ENVIRONMENTS, index),
});

const hostRecord = (index: number): InframonitoringtypesHostRecordDTO => {
	const hostName = `${pick(WORKLOADS, index)}-${index + 1}.ec2.internal`;

	return {
		hostName,
		status:
			index % 7 === 6
				? InframonitoringtypesHostStatusDTO.inactive
				: InframonitoringtypesHostStatusDTO.active,
		cpu: fraction(index, 1),
		memory: fraction(index, 2),
		diskUsage: fraction(index, 3),
		wait: fraction(index, 4) / 20,
		load15: 1 + fraction(index, 5) * 4,
		activeHostCount: 0,
		inactiveHostCount: 0,
		meta: {
			[INFRA_MONITORING_ATTR_KEYS.HOST_NAME]: hostName,
			[INFRA_MONITORING_ATTR_KEYS.OS_TYPE]: pick(OS_TYPES, index),
			[INFRA_MONITORING_ATTR_KEYS.DEPLOYMENT_ENVIRONMENT]: pick(
				ENVIRONMENTS,
				index,
			),
		},
	};
};

const POD_STATUSES = [
	InframonitoringtypesPodStatusDTO.running,
	InframonitoringtypesPodStatusDTO.running,
	InframonitoringtypesPodStatusDTO.running,
	InframonitoringtypesPodStatusDTO.pending,
	InframonitoringtypesPodStatusDTO.crashloopbackoff,
	InframonitoringtypesPodStatusDTO.completed,
];

const podRecord = (index: number): InframonitoringtypesPodRecordDTO => {
	const podStatus = pick(POD_STATUSES, index);
	const podName = `${pick(WORKLOADS, index)}-7d9f${index + 10}-${pick(
		['x4k2p', 'm7vqz', 'r2n8t', 'b6h1w'],
		index,
	)}`;

	return {
		podUID: `pod-uid-${index + 1}`,
		podStatus,
		podAge: (index + 1) * 6 * HOUR_MS,
		podCPU: cores(index, 6),
		podCPULimit: fraction(index, 7),
		podCPURequest: fraction(index, 8),
		podMemory: bytes(index, 9),
		podMemoryLimit: fraction(index, 10),
		podMemoryRequest: fraction(index, 11),
		podRestarts:
			podStatus === InframonitoringtypesPodStatusDTO.crashloopbackoff
				? 4 + (index % 5)
				: 0,
		podCountsByStatus: podCounts({ [podStatus]: 1 }),
		meta: {
			...workloadMeta(index),
			[INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME]: podName,
			[INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID]: `pod-uid-${index + 1}`,
			[INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME]: pick(NODES, index),
		},
	};
};

const nodeRecord = (index: number): InframonitoringtypesNodeRecordDTO => {
	const nodeName = `${pick(NODES, index)}-${index + 1}`;
	const isReady = index % 6 !== 5;

	return {
		nodeName,
		condition: isReady
			? InframonitoringtypesNodeConditionDTO.ready
			: InframonitoringtypesNodeConditionDTO.not_ready,
		nodeCPU: cores(index, 12),
		nodeCPUAllocatable: 4,
		nodeMemory: bytes(index, 13, 8),
		nodeMemoryAllocatable: 16 * GIB,
		nodeCountsByReadiness: { ready: isReady ? 1 : 0, notReady: isReady ? 0 : 1 },
		podCountsByStatus: podCounts({
			running: 8 + (index % 5),
			pending: index % 3,
		}),
		meta: {
			[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME]: pick(CLUSTERS, index),
			[INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME]: nodeName,
			[INFRA_MONITORING_ATTR_KEYS.K8S_NODE_UID]: `node-uid-${index + 1}`,
		},
	};
};

const namespaceRecord = (
	index: number,
): InframonitoringtypesNamespaceRecordDTO => {
	const namespaceName = `${pick(NAMESPACES, index)}-${index + 1}`;

	return {
		namespaceName,
		namespaceCPU: cores(index, 14, 2),
		namespaceMemory: bytes(index, 15, 4),
		counts: {
			daemonSets: 1 + (index % 3),
			deployments: 2 + (index % 4),
			jobs: index % 3,
			statefulSets: index % 2,
		},
		podCountsByStatus: podCounts({
			running: 6 + (index % 7),
			pending: index % 2,
		}),
		meta: {
			[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME]: pick(CLUSTERS, index),
			[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME]: namespaceName,
		},
	};
};

const clusterRecord = (index: number): InframonitoringtypesClusterRecordDTO => {
	const clusterName = `${pick(CLUSTERS, index)}-${index + 1}`;

	return {
		clusterName,
		clusterCPU: cores(index, 16, 8),
		clusterCPUAllocatable: 48,
		clusterMemory: bytes(index, 17, 40),
		clusterMemoryAllocatable: 192 * GIB,
		counts: {
			daemonSets: 3 + (index % 3),
			deployments: 12 + (index % 6),
			jobs: 2 + (index % 4),
			namespaces: 4 + (index % 3),
			nodes: 6 + (index % 5),
			statefulSets: 1 + (index % 3),
		},
		nodeCountsByReadiness: { ready: 6 + (index % 5), notReady: index % 2 },
		podCountsByStatus: podCounts({
			running: 40 + index,
			pending: index % 3,
			crashLoopBackOff: index % 2,
		}),
		meta: {
			[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME]: clusterName,
			[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_UID]: `cluster-uid-${index + 1}`,
		},
	};
};

const deploymentRecord = (
	index: number,
): InframonitoringtypesDeploymentRecordDTO => {
	const deploymentName = `${pick(WORKLOADS, index)}-deployment`;
	const desiredPods = 2 + (index % 4);

	return {
		deploymentName,
		desiredPods,
		availablePods: index % 5 === 4 ? desiredPods - 1 : desiredPods,
		deploymentCPU: cores(index, 18),
		deploymentCPULimit: fraction(index, 19),
		deploymentCPURequest: fraction(index, 20),
		deploymentMemory: bytes(index, 21, 2),
		deploymentMemoryLimit: fraction(index, 22),
		deploymentMemoryRequest: fraction(index, 23),
		podCountsByStatus: podCounts({ running: desiredPods }),
		meta: {
			...workloadMeta(index),
			[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME]: deploymentName,
		},
	};
};

const jobRecord = (index: number): InframonitoringtypesJobRecordDTO => {
	const jobName = `${pick(WORKLOADS, index)}-migration-${index + 1}`;
	const failedPods = index % 6 === 5 ? 1 : 0;

	return {
		jobName,
		activePods: index % 3 === 0 ? 1 : 0,
		desiredSuccessfulPods: 1,
		successfulPods: failedPods === 0 ? 1 : 0,
		failedPods,
		jobCPU: cores(index, 24),
		jobCPULimit: fraction(index, 25),
		jobCPURequest: fraction(index, 26),
		jobMemory: bytes(index, 27),
		jobMemoryLimit: fraction(index, 28),
		jobMemoryRequest: fraction(index, 29),
		podCountsByStatus: podCounts({
			completed: failedPods === 0 ? 1 : 0,
			failed: failedPods,
		}),
		meta: {
			...workloadMeta(index),
			[INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME]: jobName,
		},
	};
};

const daemonSetRecord = (
	index: number,
): InframonitoringtypesDaemonSetRecordDTO => {
	const daemonSetName = `${pick(
		['otel-agent', 'node-exporter', 'fluent-bit', 'kube-proxy'],
		index,
	)}-${index + 1}`;
	const desiredNodes = 4 + (index % 3);
	const readyNodes = index % 5 === 4 ? desiredNodes - 1 : desiredNodes;

	return {
		daemonSetName,
		desiredNodes,
		currentNodes: desiredNodes,
		readyNodes,
		misscheduledNodes: index % 7 === 6 ? 1 : 0,
		daemonSetCPU: cores(index, 30),
		daemonSetCPULimit: fraction(index, 31),
		daemonSetCPURequest: fraction(index, 32),
		daemonSetMemory: bytes(index, 33),
		daemonSetMemoryLimit: fraction(index, 34),
		daemonSetMemoryRequest: fraction(index, 35),
		podCountsByStatus: podCounts({ running: readyNodes }),
		meta: {
			...workloadMeta(index),
			[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME]: daemonSetName,
		},
	};
};

const statefulSetRecord = (
	index: number,
): InframonitoringtypesStatefulSetRecordDTO => {
	const statefulSetName = `${pick(
		['postgres', 'clickhouse', 'zookeeper', 'kafka'],
		index,
	)}-${index + 1}`;
	const desiredPods = 3;

	return {
		statefulSetName,
		desiredPods,
		currentPods: index % 4 === 3 ? desiredPods - 1 : desiredPods,
		statefulSetCPU: cores(index, 36),
		statefulSetCPULimit: fraction(index, 37),
		statefulSetCPURequest: fraction(index, 38),
		statefulSetMemory: bytes(index, 39, 3),
		statefulSetMemoryLimit: fraction(index, 40),
		statefulSetMemoryRequest: fraction(index, 41),
		podCountsByStatus: podCounts({ running: desiredPods }),
		meta: {
			...workloadMeta(index),
			[INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME]: statefulSetName,
		},
	};
};

const volumeRecord = (index: number): InframonitoringtypesVolumeRecordDTO => {
	const persistentVolumeClaimName = `${pick(WORKLOADS, index)}-data-${index + 1}`;
	const volumeCapacity = 20 * GIB;
	const volumeUsage = volumeCapacity * (0.2 + fraction(index, 42) * 0.6);
	const volumeInodes = 1310720;
	const volumeInodesUsed = Math.round(volumeInodes * fraction(index, 43));

	return {
		persistentVolumeClaimName,
		volumeCapacity,
		volumeUsage,
		volumeAvailable: volumeCapacity - volumeUsage,
		volumeInodes,
		volumeInodesUsed,
		volumeInodesFree: volumeInodes - volumeInodesUsed,
		meta: {
			...workloadMeta(index),
			[INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME]:
				persistentVolumeClaimName,
			[INFRA_MONITORING_ATTR_KEYS.K8S_VOLUME_TYPE]: 'persistentVolumeClaim',
		},
	};
};

export type InfraRecord =
	| InframonitoringtypesHostRecordDTO
	| InframonitoringtypesPodRecordDTO
	| InframonitoringtypesNodeRecordDTO
	| InframonitoringtypesNamespaceRecordDTO
	| InframonitoringtypesClusterRecordDTO
	| InframonitoringtypesDeploymentRecordDTO
	| InframonitoringtypesJobRecordDTO
	| InframonitoringtypesDaemonSetRecordDTO
	| InframonitoringtypesStatefulSetRecordDTO
	| InframonitoringtypesVolumeRecordDTO;

const RECORD_BUILDERS: Record<InfraEntity, (index: number) => InfraRecord> = {
	[InfraMonitoringEntity.HOSTS]: hostRecord,
	[InfraMonitoringEntity.PODS]: podRecord,
	[InfraMonitoringEntity.NODES]: nodeRecord,
	[InfraMonitoringEntity.NAMESPACES]: namespaceRecord,
	[InfraMonitoringEntity.CLUSTERS]: clusterRecord,
	[InfraMonitoringEntity.DEPLOYMENTS]: deploymentRecord,
	[InfraMonitoringEntity.JOBS]: jobRecord,
	[InfraMonitoringEntity.DAEMONSETS]: daemonSetRecord,
	[InfraMonitoringEntity.STATEFULSETS]: statefulSetRecord,
	[InfraMonitoringEntity.VOLUMES]: volumeRecord,
};

/**
 * The attribute the Group rows control groups by: the one every record of that
 * entity carries, so no row lands in `<no-value>`.
 */
export const GROUP_BY_KEY_BY_ENTITY: Record<InfraEntity, string> = {
	[InfraMonitoringEntity.HOSTS]: INFRA_MONITORING_ATTR_KEYS.OS_TYPE,
	[InfraMonitoringEntity.PODS]: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
	[InfraMonitoringEntity.NODES]: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
	[InfraMonitoringEntity.NAMESPACES]:
		INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
	[InfraMonitoringEntity.CLUSTERS]: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
	[InfraMonitoringEntity.DEPLOYMENTS]:
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
	[InfraMonitoringEntity.JOBS]: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
	[InfraMonitoringEntity.DAEMONSETS]:
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
	[InfraMonitoringEntity.STATEFULSETS]:
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
	[InfraMonitoringEntity.VOLUMES]: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
};

const buildRecords = (entity: InfraEntity, count: number): InfraRecord[] =>
	Array.from({ length: count }, (_unused, index) =>
		RECORD_BUILDERS[entity](index),
	);

const isHostRecord = (
	record: InfraRecord,
): record is InframonitoringtypesHostRecordDTO => 'hostName' in record;

const hasPodCounts = (
	record: InfraRecord,
): record is InfraRecord & {
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
} => 'podCountsByStatus' in record;

/**
 * A grouped row carries only the grouped-by attributes in `meta` and the counts
 * of the rows behind it; the table reads the names from the group cell, not from
 * the record.
 */
const groupRow = (
	record: InfraRecord,
	meta: Record<string, string>,
	size: number,
): InfraRecord => {
	const grouped = { ...record, meta };

	if (isHostRecord(grouped)) {
		return {
			...grouped,
			activeHostCount: size,
			inactiveHostCount: size > 2 ? 1 : 0,
		};
	}

	if (hasPodCounts(grouped)) {
		return {
			...grouped,
			podCountsByStatus: podCounts({
				running: size * 2,
				pending: size > 2 ? 1 : 0,
			}),
		};
	}

	return grouped;
};

const groupRecords = (
	records: InfraRecord[],
	groupBy: string[],
): InfraRecord[] => {
	const groups = new Map<
		string,
		{ meta: Record<string, string>; size: number }
	>();

	records.forEach((record) => {
		const meta = Object.fromEntries(
			groupBy.map((key) => [key, record.meta?.[key] ?? '']),
		);
		const groupKey = JSON.stringify(meta);
		const group = groups.get(groupKey);

		if (group) {
			group.size += 1;
			return;
		}

		groups.set(groupKey, { meta, size: 1 });
	});

	return [...groups.values()].map(({ meta, size }, index) =>
		groupRow(records[index], meta, size),
	);
};

export interface InfraListResponseOptions {
	entity: InfraEntity;
	count: number;
	offset?: number;
	limit?: number;
	groupBy?: string[];
	status?: string;
	warning?: boolean;
	endTimeBeforeRetention?: boolean;
}

const LIST_WARNING: Querybuildertypesv5QueryWarnDataDTO = {
	message: 'Some series were dropped to keep the query within limits.',
	url: 'https://signoz.io/docs/userguide/query-builder/',
	warnings: [
		{ message: 'The metric k8s.pod.cpu.usage has partial data for this range.' },
	],
};

export const infraListResponse = ({
	entity,
	count,
	offset = 0,
	limit = 10,
	groupBy = [],
	status,
	warning = false,
	endTimeBeforeRetention = false,
}: InfraListResponseOptions): {
	status: string;
	data: {
		type: InframonitoringtypesResponseTypeDTO;
		records: InfraRecord[];
		total: number;
		endTimeBeforeRetention: boolean;
		warning?: Querybuildertypesv5QueryWarnDataDTO;
	};
} => {
	const all = buildRecords(entity, count).filter(
		(record) => !status || !isHostRecord(record) || record.status === status,
	);

	const rows = groupBy.length > 0 ? groupRecords(all, groupBy) : all;

	return {
		status: 'success',
		data: {
			type:
				groupBy.length > 0
					? InframonitoringtypesResponseTypeDTO.grouped_list
					: InframonitoringtypesResponseTypeDTO.list,
			records: rows.slice(offset, offset + limit),
			total: rows.length,
			endTimeBeforeRetention,
			...(warning ? { warning: LIST_WARNING } : {}),
		},
	};
};

export interface EntitySelection {
	selectedItem: string;
	clusterName?: string;
	namespaceName?: string;
}

/**
 * The row the Details drawer opens on: the first record of the entity, keyed the
 * way its `getItemKey` keys it, so the drawer's own fetch resolves to it.
 */
export const entitySelection = (entity: InfraEntity): EntitySelection => {
	const record = RECORD_BUILDERS[entity](0);
	const meta = record.meta ?? {};

	const selectedItem = ((): string => {
		switch (entity) {
			case InfraMonitoringEntity.HOSTS:
				return isHostRecord(record) ? record.hostName : '';
			case InfraMonitoringEntity.PODS:
				return meta[INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID] ?? '';
			case InfraMonitoringEntity.NODES:
				return meta[INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME] ?? '';
			case InfraMonitoringEntity.NAMESPACES:
				return meta[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ?? '';
			case InfraMonitoringEntity.CLUSTERS:
				return meta[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? '';
			case InfraMonitoringEntity.DEPLOYMENTS:
				return meta[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ?? '';
			case InfraMonitoringEntity.JOBS:
				return meta[INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME] ?? '';
			case InfraMonitoringEntity.DAEMONSETS:
				return meta[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ?? '';
			case InfraMonitoringEntity.STATEFULSETS:
				return meta[INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME] ?? '';
			default:
				return (
					meta[INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME] ?? ''
				);
		}
	})();

	return {
		selectedItem,
		clusterName: meta[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
		namespaceName: meta[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME],
	};
};

export const CHECKS_STATES = [
	'missing',
	'all-present',
	'ready',
	'no-checks',
] as const;

export type ChecksState = (typeof CHECKS_STATES)[number];

const CHECK_TYPE_BY_ENTITY: Record<
	InfraEntity,
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
	[InfraMonitoringEntity.JOBS]: InframonitoringtypesCheckTypeDTO.jobs,
	[InfraMonitoringEntity.DAEMONSETS]:
		InframonitoringtypesCheckTypeDTO.daemonsets,
	[InfraMonitoringEntity.STATEFULSETS]:
		InframonitoringtypesCheckTypeDTO.statefulsets,
	[InfraMonitoringEntity.VOLUMES]: InframonitoringtypesCheckTypeDTO.volumes,
};

interface CheckComponents {
	receiver: InframonitoringtypesAssociatedComponentDTO;
	processor: InframonitoringtypesAssociatedComponentDTO;
	presentMetrics: string[];
	presentAttributes: string[];
	missingMetrics: string[];
	missingMetricsMessage: string;
	missingAttributes: string[];
	missingAttributesMessage: string;
	documentationLink: string;
}

const K8S_COMPONENTS: CheckComponents = {
	receiver: {
		name: 'kubeletstatsreceiver',
		type: InframonitoringtypesCheckComponentTypeDTO.receiver,
	},
	processor: {
		name: 'k8sattributesprocessor',
		type: InframonitoringtypesCheckComponentTypeDTO.processor,
	},
	presentMetrics: ['k8s.pod.cpu.usage', 'k8s.pod.memory.usage'],
	presentAttributes: [
		INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID,
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
	],
	missingMetrics: [INFRA_MONITORING_ATTR_KEYS.K8S_POD_CPU_LIMIT_UTILIZATION],
	missingMetricsMessage:
		'Set `k8s.pod.cpu_limit_utilization` to `enabled: true` on the kubeletstats receiver.',
	missingAttributes: [INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
	missingAttributesMessage:
		'Add `k8s.cluster.name` to the k8sattributes processor so rows can be grouped by cluster.',
	documentationLink:
		'https://signoz.io/docs/infrastructure-monitoring/kubernetes/',
};

const HOST_COMPONENTS: CheckComponents = {
	receiver: {
		name: 'hostmetricsreceiver',
		type: InframonitoringtypesCheckComponentTypeDTO.receiver,
	},
	processor: {
		name: 'resourcedetectionprocessor',
		type: InframonitoringtypesCheckComponentTypeDTO.processor,
	},
	presentMetrics: [
		INFRA_MONITORING_ATTR_KEYS.SYSTEM_CPU_LOAD_AVERAGE_15M,
		'system.memory.usage',
	],
	presentAttributes: [INFRA_MONITORING_ATTR_KEYS.HOST_NAME],
	missingMetrics: ['system.filesystem.usage'],
	missingMetricsMessage:
		'Enable the filesystem scraper on the hostmetrics receiver to report disk usage.',
	missingAttributes: [INFRA_MONITORING_ATTR_KEYS.OS_TYPE],
	missingAttributesMessage:
		'Add the system detector to the resourcedetection processor so hosts report their OS type.',
	documentationLink:
		'https://signoz.io/docs/infrastructure-monitoring/hostmetrics/',
};

const EMPTY_CHECKS = {
	presentDefaultEnabledMetrics: null,
	presentOptionalMetrics: null,
	presentRequiredAttributes: null,
	missingDefaultEnabledMetrics: null,
	missingOptionalMetrics: null,
	missingRequiredAttributes: null,
};

const presentChecks = (
	components: CheckComponents,
): Partial<InframonitoringtypesChecksDTO> => ({
	presentDefaultEnabledMetrics: [
		{
			associatedComponent: components.receiver,
			metrics: components.presentMetrics,
		},
	],
	presentRequiredAttributes: [
		{
			associatedComponent: components.processor,
			attributes: components.presentAttributes,
		},
	],
});

const missingChecks = (
	components: CheckComponents,
): Partial<InframonitoringtypesChecksDTO> => ({
	missingOptionalMetrics: [
		{
			associatedComponent: components.receiver,
			metrics: components.missingMetrics,
			message: components.missingMetricsMessage,
			documentationLink: components.documentationLink,
		},
	],
	missingRequiredAttributes: [
		{
			associatedComponent: components.processor,
			attributes: components.missingAttributes,
			message: components.missingAttributesMessage,
			documentationLink: components.documentationLink,
		},
	],
});

export const infraChecksResponse = (
	entity: InfraEntity,
	state: ChecksState,
): { status: string; data: InframonitoringtypesChecksDTO } => {
	const type = CHECK_TYPE_BY_ENTITY[entity];

	const components =
		entity === InfraMonitoringEntity.HOSTS ? HOST_COMPONENTS : K8S_COMPONENTS;

	const checks = ((): Omit<InframonitoringtypesChecksDTO, 'ready' | 'type'> => {
		switch (state) {
			case 'missing':
				return {
					...EMPTY_CHECKS,
					...presentChecks(components),
					...missingChecks(components),
				};
			case 'all-present':
				return { ...EMPTY_CHECKS, ...presentChecks(components) };
			default:
				return EMPTY_CHECKS;
		}
	})();

	return {
		status: 'success',
		data: { ...checks, ready: state === 'ready', type },
	};
};

/**
 * Resource keys the toolbar's Group by select and the search bar offer for the
 * entity, all of them attributes the records carry.
 */
export const infraFieldKeys = (entity: InfraEntity): string[] =>
	entity === InfraMonitoringEntity.HOSTS
		? [
				INFRA_MONITORING_ATTR_KEYS.HOST_NAME,
				INFRA_MONITORING_ATTR_KEYS.OS_TYPE,
				INFRA_MONITORING_ATTR_KEYS.DEPLOYMENT_ENVIRONMENT,
			]
		: [
				INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
				INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
				INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
				INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME,
				INFRA_MONITORING_ATTR_KEYS.DEPLOYMENT_ENVIRONMENT,
			];

const FIELD_VALUES: Record<string, readonly string[]> = {
	[INFRA_MONITORING_ATTR_KEYS.HOST_NAME]: WORKLOADS.slice(0, 6).map(
		(workload, index) => `${workload}-${index + 1}.ec2.internal`,
	),
	[INFRA_MONITORING_ATTR_KEYS.OS_TYPE]: ['linux', 'darwin'],
	[INFRA_MONITORING_ATTR_KEYS.DEPLOYMENT_ENVIRONMENT]: ['production', 'staging'],
	[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME]: CLUSTERS,
	[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME]: NAMESPACES,
	[INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME]: NODES,
	[INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME]: WORKLOADS.slice(0, 6),
	[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME]: WORKLOADS.slice(0, 6).map(
		(workload) => `${workload}-deployment`,
	),
	[INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME]: WORKLOADS.slice(0, 4).map(
		(workload, index) => `${workload}-migration-${index + 1}`,
	),
	[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME]: [
		'otel-agent',
		'node-exporter',
		'fluent-bit',
		'kube-proxy',
	],
	[INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME]: [
		'postgres',
		'clickhouse',
		'zookeeper',
		'kafka',
	],
	[INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME]: WORKLOADS.slice(
		0,
		4,
	).map((workload, index) => `${workload}-data-${index + 1}`),
};

export const infraFieldValues = (name: string | null): readonly string[] =>
	(name && FIELD_VALUES[name]) || [];

const LOG_LEVELS = ['INFO', 'INFO', 'WARN', 'ERROR'];

export const entityLogRows = (
	start: number,
	end: number,
	count: number,
): RawRow[] =>
	Array.from({ length: count }, (_unused, index) => {
		const timestamp = new Date(
			end - ((end - start) / Math.max(count, 1)) * index,
		).toISOString();
		const severity = pick(LOG_LEVELS, index);

		return {
			timestamp,
			data: {
				id: `log-${index + 1}`,
				body: `${severity} ${pick(WORKLOADS, index)} handled request in ${
					12 + index
				}ms`,
				severity_text: severity,
				severity_number: severity === 'ERROR' ? 17 : 9,
				attributes_string: {
					'log.level': severity,
					[INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME]: pick(WORKLOADS, index),
				},
				attributes_bool: {},
				attributes_int64: {},
				attributes_float64: {},
				resources_string: {
					[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME]: pick(NAMESPACES, index),
					[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME]: pick(CLUSTERS, index),
				},
				trace_id: '',
				span_id: '',
				trace_flags: 0,
			},
		};
	});

const K8S_EVENT_BODIES = [
	{ severity: 'INFO', body: 'Created container checkout' },
	{ severity: 'INFO', body: 'Started container checkout' },
	{ severity: 'WARN', body: 'Back-off restarting failed container' },
	{
		severity: 'INFO',
		body: 'Successfully assigned default/checkout to ip-10-0-1-24',
	},
	{
		severity: 'WARN',
		body: 'Readiness probe failed: HTTP probe failed with statuscode: 503',
	},
	{ severity: 'INFO', body: 'Pulled image "signoz/checkout:1.4.2" in 812ms' },
];

export const entityEventRows = (
	start: number,
	end: number,
	count: number,
): RawRow[] =>
	Array.from({ length: count }, (_unused, index) => {
		const event = pick(K8S_EVENT_BODIES, index);

		return {
			timestamp: new Date(
				end - ((end - start) / Math.max(count, 1)) * index,
			).toISOString(),
			data: {
				id: `event-${index + 1}`,
				body: event.body,
				severity_text: event.severity,
				severity_number: event.severity === 'WARN' ? 13 : 9,
				attributes_string: {
					[INFRA_MONITORING_ATTR_KEYS.K8S_OBJECT_KIND]: 'Pod',
					[INFRA_MONITORING_ATTR_KEYS.K8S_OBJECT_NAME]: pick(WORKLOADS, index),
				},
				attributes_bool: {},
				attributes_int64: {},
				attributes_float64: {},
				resources_string: {
					[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME]: pick(NAMESPACES, index),
					[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME]: pick(CLUSTERS, index),
				},
				trace_id: '',
				span_id: '',
				trace_flags: 0,
			},
		};
	});

const HTTP_METHODS = ['GET', 'POST', 'GET', 'PUT'];
const STATUS_CODES = ['200', '200', '500', '404'];

export const entityTraceRows = (
	start: number,
	end: number,
	count: number,
): RawRow[] =>
	Array.from({ length: count }, (_unused, index) => ({
		timestamp: new Date(
			end - ((end - start) / Math.max(count, 1)) * index,
		).toISOString(),
		data: {
			serviceName: pick(WORKLOADS, index),
			name: `${pick(HTTP_METHODS, index)} /api/v1/${pick(WORKLOADS, index)}`,
			durationNano: (20 + index * 7) * 1000000,
			httpMethod: pick(HTTP_METHODS, index),
			responseStatusCode: pick(STATUS_CODES, index),
			spanID: `span-${index + 1}`,
			traceID: `trace-${index + 1}`,
		},
	}));

export interface MetricScale {
	base: number;
	amplitude: number;
}

/** What a `percentunit` widget expects: a fraction of one. */
export const RATIO_SCALE: MetricScale = { base: 0.45, amplitude: 0.2 };

/**
 * The magnitude a drawer widget expects, taken from the metric it asks for: the
 * charts format their own axis, so a byte widget fed a ratio reads "0.7 B".
 */
export const metricScale = (metricName: string | undefined): MetricScale => {
	const name = metricName ?? '';

	if (name.includes('utilization')) {
		return RATIO_SCALE;
	}

	if (
		name.includes('memory') ||
		name.includes('filesystem') ||
		name.includes('network.io')
	) {
		return { base: 700 * MIB, amplitude: 220 * MIB };
	}

	if (name.includes('errors') || name.includes('restarts')) {
		return { base: 3, amplitude: 2 };
	}

	if (name.includes('cpu')) {
		return { base: 1.2, amplitude: 0.6 };
	}

	return RATIO_SCALE;
};
