/* eslint-disable sonarjs/cognitive-complexity */
import './InfraMonitoringK8s.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Progress, Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sPodsData,
	K8sPodsListPayload,
} from 'api/infraMonitoring/getK8sPodsList';
import { Group } from 'lucide-react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export interface IEntityColumn {
	label: string;
	value: string;
	id: string;
	canRemove: boolean;
}

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
		value: 'cpuRequestUtilization',
		id: 'cpuRequestUtilization',
		canRemove: false,
	},
	{
		label: 'CPU Limit Utilization (% of request)',
		value: 'cpuLimitUtilization',
		id: 'cpuLimitUtilization',
		canRemove: false,
	},
	{
		label: 'CPU Utilization (cores)',
		value: 'cpuUtilization',
		id: 'cpuUtilization',
		canRemove: false,
	},
	{
		label: 'Memory Request Utilization (% of limit)',
		value: 'memoryRequestUtilization',
		id: 'memoryRequestUtilization',
		canRemove: false,
	},
	{
		label: 'Memory Limit Utilization (% of request)',
		value: 'memoryLimitUtilization',
		id: 'memoryLimitUtilization',
		canRemove: false,
	},
	{
		label: 'Memory Utilization (bytes)',
		value: 'memoryUtilization',
		id: 'memoryUtilization',
		canRemove: false,
	},
	{
		label: 'Container Restarts',
		value: 'containerRestarts',
		id: 'containerRestarts',
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
	cpuRequestUtilization: React.ReactNode;
	cpuLimitUtilization: React.ReactNode;
	cpuUtilization: React.ReactNode;
	memoryRequestUtilization: React.ReactNode;
	memoryLimitUtilization: React.ReactNode;
	memoryUtilization: React.ReactNode;
	containerRestarts: number;
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
				<Tooltip title="CPU Request Utilization (% of limit)">CPU Req Util</Tooltip>
			</div>
		),
		dataIndex: 'cpuRequestUtilization',
		key: 'cpuRequestUtilization',
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header">
				<Tooltip title="CPU Limit Utilization (% of request)">
					CPU Limit Util
				</Tooltip>
			</div>
		),
		dataIndex: 'cpuLimitUtilization',
		key: 'cpuLimitUtilization',
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header">
				<Tooltip title="CPU Utilization (cores)">CPU Util (cores)</Tooltip>
			</div>
		),
		dataIndex: 'cpuUtilization',
		key: 'cpuUtilization',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header">
				<Tooltip title="Memory Request Utilization (% of limit)">
					Mem Req Util
				</Tooltip>
			</div>
		),
		dataIndex: 'memoryRequestUtilization',
		key: 'memoryRequestUtilization',
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header">
				<Tooltip title="Memory Limit Utilization (% of request)">
					Mem Limit Util
				</Tooltip>
			</div>
		),
		dataIndex: 'memoryLimitUtilization',
		key: 'memoryLimitUtilization',
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header">
				<Tooltip title="Memory Utilization (bytes)">Mem Util (bytes)</Tooltip>
			</div>
		),
		dataIndex: 'memoryUtilization',
		key: 'memoryUtilization',
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
		dataIndex: 'containerRestarts',
		key: 'containerRestarts',
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
				<div className="pod-name">{pod.meta.k8s_pod_name || ''}</div>
			</div>
		),
		podUID: pod.podUID || '',
		cpuRequestUtilization: (
			<div className="progress-container">
				<Progress
					percent={Number((pod.podCPURequest * 100).toFixed(1))}
					strokeLinecap="butt"
					size="small"
					status="active"
					strokeColor={((): string => {
						const cpuPercent = Number((pod.podCPURequest * 100).toFixed(1));
						if (cpuPercent >= 90) return Color.BG_SAKURA_500;
						if (cpuPercent >= 60) return Color.BG_AMBER_500;
						return Color.BG_FOREST_500;
					})()}
					className="progress-bar"
				/>
			</div>
		),
		cpuLimitUtilization: (
			<div className="progress-container">
				<Progress
					percent={Number((pod.podCPULimit * 100).toFixed(1))}
					strokeLinecap="butt"
					size="small"
					status="active"
					strokeColor={((): string => {
						const cpuPercent = Number((pod.podCPULimit * 100).toFixed(1));
						if (cpuPercent >= 90) return Color.BG_SAKURA_500;
						if (cpuPercent >= 60) return Color.BG_AMBER_500;
						return Color.BG_FOREST_500;
					})()}
					className="progress-bar"
				/>
			</div>
		),
		cpuUtilization: pod.podCPU,
		memoryRequestUtilization: (
			<div className="progress-container">
				<Progress
					percent={Number((pod.podMemoryRequest * 100).toFixed(1))}
					strokeLinecap="butt"
					size="small"
					status="active"
					strokeColor={((): string => {
						const memoryPercent = Number((pod.podMemoryRequest * 100).toFixed(1));
						if (memoryPercent >= 90) return Color.BG_SAKURA_500;
						if (memoryPercent >= 60) return Color.BG_AMBER_500;
						return Color.BG_FOREST_500;
					})()}
					className="progress-bar"
				/>
			</div>
		),
		memoryLimitUtilization: (
			<div className="progress-container">
				<Progress
					percent={Number((pod.podMemoryLimit * 100).toFixed(1))}
					strokeLinecap="butt"
					size="small"
					status="active"
					strokeColor={((): string => {
						const memoryPercent = Number((pod.podMemoryLimit * 100).toFixed(1));
						if (memoryPercent >= 90) return Color.BG_SAKURA_500;
						if (memoryPercent >= 60) return Color.BG_AMBER_500;
						return Color.BG_FOREST_500;
					})()}
					className="progress-bar"
				/>
			</div>
		),
		memoryUtilization: pod.podMemory,
		containerRestarts: pod.restartCount,
		namespace: pod.meta.k8s_namespace_name,
		node: pod.meta.k8s_node_name,
		cluster: pod.meta.k8s_job_name,
		meta: pod.meta,
		podGroup: getGroupByEle(pod, groupBy),
		...pod.meta,
		groupedByMeta: pod.meta,
	}));
