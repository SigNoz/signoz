/* eslint-disable sonarjs/cognitive-complexity */
import './InfraMonitoringK8s.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Progress } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sPodsData,
	K8sPodsListPayload,
} from 'api/infraMonitoring/getK8sPodsList';
import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/QuickFilters';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

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
	podName: string;
	podUID: string;
	cpuRequestUtilization: React.ReactNode;
	cpuLimitUtilization: React.ReactNode;
	cpuUtilization: React.ReactNode;
	memoryRequestUtilization: React.ReactNode;
	memoryLimitUtilization: React.ReactNode;
	memoryUtilization: React.ReactNode;
	containerRestarts: number;
}

export const K8sQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Pods',
		attributeKey: {
			key: 'k8s.pod.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
			id: 'k8s.pod.name--string--resource--true',
		},
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Namespace',
		attributeKey: {
			key: 'k8s.namespace.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Nodes',
		attributeKey: {
			key: 'k8s.node.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
			id: 'k8s.node.name--string--resource--true',
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Cluster',
		attributeKey: {
			key: 'k8s.cluster.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Deployments',
		attributeKey: {
			key: 'k8s.deployment.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Statefulsets',
		attributeKey: {
			key: 'k8s.statefulset.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'DaemonSets',
		attributeKey: {
			key: 'k8s.daemonset.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Jobs',
		attributeKey: {
			key: 'k8s.job.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Volumes',
		attributeKey: {
			key: 'k8s.volume.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: false,
	},
];

export const getK8sPodsListQuery = (): K8sPodsListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

const columnsConfig = [
	{
		title: <div className="column-header-left">Pod Name</div>,
		dataIndex: 'podName',
		key: 'podName',
		ellipsis: true,
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left">
				CPU Request Utilization (% of limit)
			</div>
		),
		dataIndex: 'cpuRequestUtilization',
		key: 'cpuRequestUtilization',
		width: 100,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left">
				CPU Limit Utilization (% of request)
			</div>
		),
		dataIndex: 'cpuLimitUtilization',
		key: 'cpuLimitUtilization',
		width: 100,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">CPU Utilization (cores)</div>,
		dataIndex: 'cpuUtilization',
		key: 'cpuUtilization',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left">
				Memory Request Utilization (% of limit)
			</div>
		),
		dataIndex: 'memoryRequestUtilization',
		key: 'memoryRequestUtilization',
		width: 100,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left">
				Memory Limit Utilization (% of request)
			</div>
		),
		dataIndex: 'memoryLimitUtilization',
		key: 'memoryLimitUtilization',
		width: 100,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Memory Utilization (bytes)</div>,
		dataIndex: 'memoryUtilization',
		key: 'memoryUtilization',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Container Restarts</div>,
		dataIndex: 'containerRestarts',
		key: 'containerRestarts',
		width: 50,
		sorter: true,
		align: 'left',
	},
];

export const namespaceColumnConfig = {
	title: <div className="column-header-left">Namespace</div>,
	dataIndex: 'namespace',
	key: 'namespace',
	width: 100,
	sorter: true,
	ellipsis: true,
	align: 'left',
};

export const nodeColumnConfig = {
	title: <div className="column-header-left">Node</div>,
	dataIndex: 'node',
	key: 'node',
	width: 100,
	sorter: true,
	ellipsis: true,
	align: 'left',
};

export const clusterColumnConfig = {
	title: <div className="column-header-left">Cluster</div>,
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
): ColumnType<K8sPodsRowData>[] => {
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

export const formatDataForTable = (data: K8sPodsData[]): K8sPodsRowData[] =>
	data.map((pod, index) => ({
		key: `${pod.podUID}-${index}`,
		podName: pod.meta.k8s_pod_name || '',
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
		cluster: pod.meta.k8s_job_name, // TODO: Need to update this
	}));
