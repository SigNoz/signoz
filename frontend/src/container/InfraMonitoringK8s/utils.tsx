/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable sonarjs/cognitive-complexity */
import './InfraMonitoringK8s.styles.scss';

import { Progress, Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sPodsData,
	K8sPodsListPayload,
} from 'api/infraMonitoring/getK8sPodsList';
import { Group } from 'lucide-react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import {
	formatBytes,
	getProgressBarText,
	getStrokeColorForLimitUtilization,
	getStrokeColorForRequestUtilization,
	ValidateColumnValueWrapper,
} from './commonUtils';
import { INVALID_MEMORY_CPU_VALUE_MESSAGE } from './constants';

export interface IPodColumn {
	label: string;
	value: string;
	id: string;
	canRemove: boolean;
}

export const defaultAddedColumns: IPodColumn[] = [
	{
		label: 'Pod name',
		value: 'podName',
		id: 'podName',
		canRemove: false,
	},
	{
		label: 'CPU Request Utilization (% of limit)',
		value: 'cpu_request',
		id: 'cpu_request',
		canRemove: false,
	},
	{
		label: 'CPU Limit Utilization (% of request)',
		value: 'cpu_limit',
		id: 'cpu_limit',
		canRemove: false,
	},
	{
		label: 'CPU Utilization (cores)',
		value: 'cpu',
		id: 'cpu',
		canRemove: false,
	},
	{
		label: 'Memory Request Utilization (% of limit)',
		value: 'memory_request',
		id: 'memory_request',
		canRemove: false,
	},
	{
		label: 'Memory Limit Utilization (% of request)',
		value: 'memory_limit',
		id: 'memory_limit',
		canRemove: false,
	},
	{
		label: 'Memory Utilization (bytes)',
		value: 'memory',
		id: 'memory',
		canRemove: false,
	},
	{
		label: 'Container Restarts',
		value: 'restarts',
		id: 'restarts',
		canRemove: false,
	},
];

export const defaultAvailableColumns = [
	{
		label: 'Namespace name',
		value: 'namespace',
		id: 'namespace',
		canRemove: true,
	},
	{
		label: 'Node name',
		value: 'node',
		id: 'node',
		canRemove: true,
	},
	{
		label: 'Cluster name',
		value: 'cluster',
		id: 'cluster',
		canRemove: true,
	},
];

export interface K8sPodsRowData {
	key: string;
	podName: React.ReactNode;
	podUID: string;
	cpu_request: React.ReactNode;
	cpu_limit: React.ReactNode;
	cpu: React.ReactNode;
	memory_request: React.ReactNode;
	memory_limit: React.ReactNode;
	memory: React.ReactNode;
	restarts: number;
	groupedByMeta?: any;
}

export const getK8sPodsListQuery = (): K8sPodsListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

const podGroupColumnConfig = {
	title: (
		<div className="column-header pod-group-header">
			<Group size={14} /> POD GROUP
		</div>
	),
	dataIndex: 'podGroup',
	key: 'podGroup',
	ellipsis: {
		showTitle: false,
	},
	width: 120,
	align: 'left',
	sorter: false,
};

export const dummyColumnConfig = {
	title: <div className="column-header dummy-column">&nbsp;</div>,
	dataIndex: 'dummy',
	key: 'dummy',
	width: 25,
	sorter: false,
	align: 'left',
};

const columnsConfig = [
	{
		title: <div className="column-header pod-name-header">Pod Name</div>,
		dataIndex: 'podName',
		key: 'podName',
		ellipsis: {
			showTitle: false,
		},
		width: 120,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header">
				<Tooltip title={INVALID_MEMORY_CPU_VALUE_MESSAGE}>
					CPU Request Utilization (% of limit)
				</Tooltip>
			</div>
		),
		dataIndex: 'cpu_request',
		key: 'cpu_request',
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header">
				<Tooltip title={INVALID_MEMORY_CPU_VALUE_MESSAGE}>
					CPU Limit Utilization (% of request)
				</Tooltip>
			</div>
		),
		dataIndex: 'cpu_limit',
		key: 'cpu_limit',
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header">
				<Tooltip title={INVALID_MEMORY_CPU_VALUE_MESSAGE}>
					CPU Utilization (cores)
				</Tooltip>
			</div>
		),
		dataIndex: 'cpu',
		key: 'cpu',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header">
				<Tooltip title={INVALID_MEMORY_CPU_VALUE_MESSAGE}>
					Memory Request Utilization (% of limit)
				</Tooltip>
			</div>
		),
		dataIndex: 'memory_request',
		key: 'memory_request',
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header">
				<Tooltip title={INVALID_MEMORY_CPU_VALUE_MESSAGE}>
					Memory Limit Utilization (% of request)
				</Tooltip>
			</div>
		),
		dataIndex: 'memory_limit',
		key: 'memory_limit',
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header">
				<Tooltip title={INVALID_MEMORY_CPU_VALUE_MESSAGE}>
					Memory Utilization (bytes)
				</Tooltip>
			</div>
		),
		dataIndex: 'memory',
		key: 'memory',
		width: 100,
		ellipsis: true,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header">
				<Tooltip title="Container Restarts">Container Restarts</Tooltip>
			</div>
		),
		dataIndex: 'restarts',
		key: 'restarts',
		width: 100,
		ellipsis: true,
		sorter: true,
		align: 'left',
	},
];

export const namespaceColumnConfig = {
	title: <div className="column-header">Namespace</div>,
	dataIndex: 'namespace',
	key: 'namespace',
	width: 100,
	sorter: true,
	ellipsis: true,
	align: 'left',
};

export const nodeColumnConfig = {
	title: <div className="column-header">Node</div>,
	dataIndex: 'node',
	key: 'node',
	width: 100,
	sorter: true,
	ellipsis: true,
	align: 'left',
};

export const clusterColumnConfig = {
	title: <div className="column-header">Cluster</div>,
	dataIndex: 'cluster',
	key: 'cluster',
	width: 100,
	sorter: true,
	ellipsis: true,
	align: 'left',
};

export const columnConfigMap = {
	namespace: namespaceColumnConfig,
	node: nodeColumnConfig,
	cluster: clusterColumnConfig,
};

export const getK8sPodsListColumns = (
	addedColumns: IPodColumn[],
	groupBy: IBuilderQuery['groupBy'],
): ColumnType<K8sPodsRowData>[] => {
	if (groupBy.length > 0) {
		const filteredColumns = [...columnsConfig].filter(
			(column) => column.key !== 'podName',
		);

		filteredColumns.unshift(podGroupColumnConfig);

		return filteredColumns as ColumnType<K8sPodsRowData>[];
	}

	const updatedColumnsConfig = [...columnsConfig];

	// eslint-disable-next-line no-restricted-syntax
	for (const column of addedColumns) {
		const config = columnConfigMap[column.id as keyof typeof columnConfigMap];
		if (config) {
			updatedColumnsConfig.push(config);
		}
	}

	return updatedColumnsConfig as ColumnType<K8sPodsRowData>[];
};

const getGroupByEle = (
	pod: K8sPodsData,
	groupBy: IBuilderQuery['groupBy'],
): React.ReactNode => {
	const groupByValues: string[] = [];

	groupBy.forEach((group) => {
		groupByValues.push(pod.meta[group.key as keyof typeof pod.meta]);
	});

	return (
		<div className="pod-group">
			{groupByValues.map((value) => (
				<Tag key={value} color="#1D212D" className="pod-group-tag-item">
					{value === '' ? '<no-value>' : value}
				</Tag>
			))}
		</div>
	);
};

export const formatDataForTable = (
	data: K8sPodsData[],
	groupBy: IBuilderQuery['groupBy'],
): K8sPodsRowData[] =>
	data.map((pod, index) => ({
		key: `${pod.podUID}-${index}`,
		podName: (
			<div className="pod-name-container">
				<Tooltip title={pod.meta.k8s_pod_name || ''}>
					<div className="pod-name">{pod.meta.k8s_pod_name || ''}</div>
				</Tooltip>
			</div>
		),
		podUID: pod.podUID || '',
		cpu_request: (
			<ValidateColumnValueWrapper value={pod.podCPURequest}>
				<div className="progress-container">
					<Progress
						percent={Number((pod.podCPURequest * 100).toFixed(1))}
						strokeLinecap="butt"
						size="small"
						status="active"
						strokeColor={getStrokeColorForRequestUtilization(pod.podCPURequest)}
						className="progress-bar"
						format={() =>
							getProgressBarText(Number((pod.podCPURequest * 100).toFixed(1)))
						}
					/>
				</div>
			</ValidateColumnValueWrapper>
		),
		cpu_limit: (
			<ValidateColumnValueWrapper value={pod.podCPULimit}>
				<div className="progress-container">
					<Progress
						percent={Number((pod.podCPULimit * 100).toFixed(1))}
						strokeLinecap="butt"
						size="small"
						status="active"
						strokeColor={getStrokeColorForLimitUtilization(pod.podCPULimit)}
						className="progress-bar"
						format={() =>
							getProgressBarText(Number((pod.podCPULimit * 100).toFixed(1)))
						}
					/>
				</div>
			</ValidateColumnValueWrapper>
		),
		cpu: (
			<ValidateColumnValueWrapper value={pod.podCPU}>
				{pod.podCPU}
			</ValidateColumnValueWrapper>
		),
		memory_request: (
			<ValidateColumnValueWrapper value={pod.podMemoryRequest}>
				<div className="progress-container">
					<Progress
						percent={Number((pod.podMemoryRequest * 100).toFixed(1))}
						strokeLinecap="butt"
						size="small"
						status="active"
						strokeColor={getStrokeColorForRequestUtilization(pod.podMemoryRequest)}
						className="progress-bar"
						format={() =>
							getProgressBarText(Number((pod.podMemoryRequest * 100).toFixed(1)))
						}
					/>
				</div>
			</ValidateColumnValueWrapper>
		),
		memory_limit: (
			<ValidateColumnValueWrapper value={pod.podMemoryLimit}>
				<div className="progress-container">
					<Progress
						percent={Number((pod.podMemoryLimit * 100).toFixed(1))}
						strokeLinecap="butt"
						size="small"
						status="active"
						strokeColor={getStrokeColorForLimitUtilization(pod.podMemoryLimit)}
						className="progress-bar"
						format={() =>
							getProgressBarText(Number((pod.podMemoryLimit * 100).toFixed(1)))
						}
					/>
				</div>
			</ValidateColumnValueWrapper>
		),
		memory: (
			<ValidateColumnValueWrapper value={pod.podMemory}>
				{formatBytes(pod.podMemory)}
			</ValidateColumnValueWrapper>
		),
		restarts: pod.restartCount,
		namespace: pod.meta.k8s_namespace_name,
		node: pod.meta.k8s_node_name,
		cluster: pod.meta.k8s_job_name,
		meta: pod.meta,
		podGroup: getGroupByEle(pod, groupBy),
		...pod.meta,
		groupedByMeta: pod.meta,
	}));
