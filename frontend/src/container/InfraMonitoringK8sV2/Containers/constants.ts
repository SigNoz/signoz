import { InframonitoringtypesContainerRecordDTO } from 'api/generated/services/sigNoz.schemas';
import { formatValueForExpression } from 'components/QueryBuilderV2/utils';

import {
	buildEventsExpression,
	buildLogsTracesExpression,
} from '../Base/utils';
import { K8sDetailsMetadataConfig, K8sDetailsWidgetInfo } from '../Base/types';
import { INFRA_MONITORING_ATTR_KEYS } from '../constants';
import { SelectedItemParams } from '../hooks';
import {
	CONTAINERS_DOC_PATH,
	getContainerImageWithTag,
	getContainerName,
	getContainerPodUID,
} from './utils';

/** A container row is identified by the (pod UID, container name) pair. */
export const k8sContainerGetSelectedItemExpression = (
	params: SelectedItemParams,
): string =>
	[
		`${INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID} = ${formatValueForExpression(
			params.selectedItem ?? '',
		)}`,
		`${INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_NAME} = ${formatValueForExpression(
			params.containerName ?? '',
		)}`,
	].join(' AND ');

export const k8sContainerGetEntityName = getContainerName;

export const k8sContainerDetailsMetadataConfig: K8sDetailsMetadataConfig<InframonitoringtypesContainerRecordDTO>[] =
	[
		{
			label: 'Pod',
			getValue: (c): string =>
				c.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME] || '',
		},
		{
			label: 'NAMESPACE',
			getValue: (c): string =>
				c.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
		},
		{
			label: 'Node',
			getValue: (c): string =>
				c.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME] || '',
		},
		{
			label: 'Cluster Name',
			getValue: (c): string =>
				c.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] || '',
		},
		{
			label: 'Image:Tag',
			getValue: getContainerImageWithTag,
		},
	];

export const k8sContainerInitialLogTracesExpression = (
	container: InframonitoringtypesContainerRecordDTO,
): string => {
	const base = buildLogsTracesExpression({
		mainAttributeKey: INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID,
		mainAttributeValue: getContainerPodUID(container),
		clusterName: container.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
		namespaceName:
			container.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME],
	});

	const containerName = getContainerName(container);
	if (!containerName) {
		return base;
	}

	const containerClause = `${
		INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_NAME
	} = ${formatValueForExpression(containerName)}`;

	return base ? `${base} AND ${containerClause}` : containerClause;
};

/**
 * Kubernetes emits events against the pod, not the container, so the events tab
 * is scoped to the container's pod.
 */
export const k8sContainerInitialEventsExpression = (
	container: InframonitoringtypesContainerRecordDTO,
): string =>
	buildEventsExpression({
		objectKind: 'Pod',
		objectName: container.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME] || '',
		clusterName: container.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
		namespaceName:
			container.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME],
	});

export const containerWidgetInfo: K8sDetailsWidgetInfo[] = [
	{
		title: 'CPU Usage (cores)',
		yAxisUnit: '',
		docPath: `${CONTAINERS_DOC_PATH}#cpu-usage-cores-1`,
		description:
			'Avg, max and min CPU consumption of the container in cores, showing how bursty it is.',
	},
	{
		title: 'CPU Request, Limit Utilization',
		yAxisUnit: 'percentunit',
		docPath: `${CONTAINERS_DOC_PATH}#cpu-request-limit-utilization`,
		description:
			'Container CPU usage as a fraction of its own CPU request and limit; limit lines near 100% mean throttling.',
	},
	{
		title: 'Memory Usage (bytes)',
		yAxisUnit: 'bytes',
		docPath: `${CONTAINERS_DOC_PATH}#memory-usage-bytes`,
		description:
			'Total memory charged to the container, including reclaimable page cache, against the headroom left before its limit.',
	},
	{
		title: 'Memory Request, Limit Utilization',
		yAxisUnit: 'percentunit',
		docPath: `${CONTAINERS_DOC_PATH}#memory-request-limit-utilization`,
		description:
			'Container memory usage as a fraction of its own memory request and limit; limit lines near 100% risk an OOMKill.',
	},
	{
		title: 'Memory by State',
		yAxisUnit: 'bytes',
		docPath: `${CONTAINERS_DOC_PATH}#memory-by-state`,
		description:
			'RSS, working set and cache memory of the container, separating heap growth from file cache.',
	},
	{
		title: 'Memory Major Page Faults',
		yAxisUnit: '',
		docPath: `${CONTAINERS_DOC_PATH}#memory-major-page-faults`,
		description:
			'Major page fault rate of the container; sustained values mean the working set is paging to disk.',
	},
	{
		title: 'File System (bytes)',
		yAxisUnit: 'bytes',
		docPath: `${CONTAINERS_DOC_PATH}#file-system-bytes`,
		description:
			'Capacity, available and used bytes of the container filesystem.',
	},
	{
		title: 'Container Uptime',
		yAxisUnit: 's',
		docPath: `${CONTAINERS_DOC_PATH}#container-uptime`,
		description:
			'Time since the container last started; a sawtooth of resets means it is restarting repeatedly.',
	},
	{
		title: 'Node CPU Utilization by Container',
		yAxisUnit: 'percentunit',
		docPath: `${CONTAINERS_DOC_PATH}#node-cpu-utilization-by-container`,
		description:
			"The container's CPU usage as a fraction of the whole node's capacity, to spot noisy neighbours.",
	},
	{
		title: 'Node Memory Utilization by Container',
		yAxisUnit: 'percentunit',
		docPath: `${CONTAINERS_DOC_PATH}#node-memory-utilization-by-container`,
		description:
			"The container's memory usage as a fraction of the whole node's capacity.",
	},
];
