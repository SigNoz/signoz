import { Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sClustersData,
	K8sClustersListPayload,
} from 'api/infraMonitoring/getK8sClustersList';
import { Group } from 'lucide-react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { formatBytes, ValidateColumnValueWrapper } from '../commonUtils';
import { IEntityColumn } from '../utils';

export const defaultAddedColumns: IEntityColumn[] = [
	{
		label: 'Cluster Name',
		value: 'clusterName',
		id: 'cluster',
		canRemove: false,
	},
	{
		label: 'CPU Utilization (cores)',
		value: 'cpuUsage',
		id: 'cpuUsage',
		canRemove: false,
	},
	{
		label: 'CPU Allocatable (cores)',
		value: 'cpuAllocatable',
		id: 'cpuAllocatable',
		canRemove: false,
	},
	{
		label: 'Memory Utilization (cores)',
		value: 'memoryUsage',
		id: 'memoryUsage',
		canRemove: false,
	},
	{
		label: 'Memory Allocatable (bytes)',
		value: 'memoryAllocatable',
		id: 'memoryAllocatable',
		canRemove: false,
	},
];

export interface K8sClustersRowData {
	key: string;
	clusterUID: string;
	clusterName: React.ReactNode;
	cpu: React.ReactNode;
	memory: React.ReactNode;
	cpuAllocatable: React.ReactNode;
	memoryAllocatable: React.ReactNode;
	groupedByMeta?: any;
}

const clusterGroupColumnConfig = {
	title: (
		<div className="column-header pod-group-header">
			<Group size={14} /> CLUSTER GROUP
		</div>
	),
	dataIndex: 'clusterGroup',
	key: 'clusterGroup',
	ellipsis: true,
	width: 150,
	align: 'left',
	sorter: false,
};

export const getK8sClustersListQuery = (): K8sClustersListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

const columnsConfig = [
	{
		title: <div className="column-header-left">Cluster Name</div>,
		dataIndex: 'clusterName',
		key: 'clusterName',
		ellipsis: true,
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">CPU Utilization (cores)</div>,
		dataIndex: 'cpu',
		key: 'cpu',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">CPU Allocatable (cores)</div>,
		dataIndex: 'cpuAllocatable',
		key: 'cpuAllocatable',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Memory Utilization (bytes)</div>,
		dataIndex: 'memory',
		key: 'memory',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Memory Allocatable (bytes)</div>,
		dataIndex: 'memoryAllocatable',
		key: 'memoryAllocatable',
		width: 80,
		sorter: true,
		align: 'left',
	},
];

export const getK8sClustersListColumns = (
	groupBy: IBuilderQuery['groupBy'],
): ColumnType<K8sClustersRowData>[] => {
	if (groupBy.length > 0) {
		const filteredColumns = [...columnsConfig].filter(
			(column) => column.key !== 'clusterName',
		);
		filteredColumns.unshift(clusterGroupColumnConfig);
		return filteredColumns as ColumnType<K8sClustersRowData>[];
	}

	return columnsConfig as ColumnType<K8sClustersRowData>[];
};

const getGroupByEle = (
	cluster: K8sClustersData,
	groupBy: IBuilderQuery['groupBy'],
): React.ReactNode => {
	const groupByValues: string[] = [];

	groupBy.forEach((group) => {
		groupByValues.push(cluster.meta[group.key as keyof typeof cluster.meta]);
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
	data: K8sClustersData[],
	groupBy: IBuilderQuery['groupBy'],
): K8sClustersRowData[] =>
	data.map((cluster, index) => ({
		key: `${cluster.meta.k8s_cluster_name}-${index}`,
		clusterUID: cluster.meta.k8s_cluster_name,
		clusterName: (
			<Tooltip title={cluster.meta.k8s_cluster_name}>
				{cluster.meta.k8s_cluster_name}
			</Tooltip>
		),
		cpu: (
			<ValidateColumnValueWrapper value={cluster.cpuUsage}>
				{cluster.cpuUsage}
			</ValidateColumnValueWrapper>
		),
		memory: (
			<ValidateColumnValueWrapper value={cluster.memoryUsage}>
				{formatBytes(cluster.memoryUsage)}
			</ValidateColumnValueWrapper>
		),
		cpuAllocatable: (
			<ValidateColumnValueWrapper value={cluster.cpuAllocatable}>
				{cluster.cpuAllocatable}
			</ValidateColumnValueWrapper>
		),
		memoryAllocatable: (
			<ValidateColumnValueWrapper value={cluster.memoryAllocatable}>
				{formatBytes(cluster.memoryAllocatable)}
			</ValidateColumnValueWrapper>
		),
		clusterGroup: getGroupByEle(cluster, groupBy),
		meta: cluster.meta,
		...cluster.meta,
		groupedByMeta: cluster.meta,
	}));
