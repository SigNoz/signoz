import { Color } from '@signozhq/design-tokens';
import { Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sNodesData,
	K8sNodesListPayload,
} from 'api/infraMonitoring/getK8sNodesList';
import { Group } from 'lucide-react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { formatBytes, ValidateColumnValueWrapper } from '../commonUtils';
import { IEntityColumn } from '../utils';

export const defaultAddedColumns: IEntityColumn[] = [
	{
		label: 'Node Name',
		value: 'nodeName',
		id: 'nodeName',
		canRemove: false,
	},
	{
		label: 'Cluster Name',
		value: 'clusterStatus',
		id: 'clusterStatus',
		canRemove: false,
	},
	{
		label: 'CPU Usage (cores)',
		value: 'cpu',
		id: 'cpu',
		canRemove: false,
	},
	{
		label: 'CPU Alloc (cores)',
		value: 'cpu_allocatable',
		id: 'cpu_allocatable',
		canRemove: false,
	},
	{
		label: 'Memory Usage (bytes)',
		value: 'memory',
		id: 'memory',
		canRemove: false,
	},
	{
		label: 'Memory Alloc (bytes)',
		value: 'memory_allocatable',
		id: 'memory_allocatable',
		canRemove: false,
	},
];

export interface K8sNodesRowData {
	key: string;
	nodeUID: string;
	nodeName: React.ReactNode;
	clusterName: string;
	cpu: React.ReactNode;
	cpu_allocatable: React.ReactNode;
	memory: React.ReactNode;
	memory_allocatable: React.ReactNode;
	groupedByMeta?: any;
}

const nodeGroupColumnConfig = {
	title: (
		<div className="column-header entity-group-header">
			<Group size={14} /> NODE GROUP
		</div>
	),
	dataIndex: 'nodeGroup',
	key: 'nodeGroup',
	ellipsis: true,
	width: 150,
	align: 'left',
	sorter: false,
	className: 'column entity-group-header',
};

export const getK8sNodesListQuery = (): K8sNodesListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

const columnsConfig = [
	{
		title: <div className="column-header-left name-header">Node Name</div>,
		dataIndex: 'nodeName',
		key: 'nodeName',
		ellipsis: true,
		width: 80,
		sorter: false,
		align: 'left',
	},
	{
		title: <div className="column-header-left name-header">Cluster Name</div>,
		dataIndex: 'clusterName',
		key: 'clusterName',
		ellipsis: true,
		width: 80,
		sorter: false,
		align: 'left',
	},
	{
		title: <div className="column-header-left">CPU Usage (cores)</div>,
		dataIndex: 'cpu',
		key: 'cpu',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">CPU Alloc (cores)</div>,
		dataIndex: 'cpu_allocatable',
		key: 'cpu_allocatable',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Memory Usage (bytes)</div>,
		dataIndex: 'memory',
		key: 'memory',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Memory Alloc (bytes)</div>,
		dataIndex: 'memory_allocatable',
		key: 'memory_allocatable',
		width: 80,
		sorter: true,
		align: 'left',
	},
];

export const getK8sNodesListColumns = (
	groupBy: IBuilderQuery['groupBy'],
): ColumnType<K8sNodesRowData>[] => {
	if (groupBy.length > 0) {
		const filteredColumns = [...columnsConfig].filter(
			(column) => column.key !== 'nodeName',
		);
		filteredColumns.unshift(nodeGroupColumnConfig);
		return filteredColumns as ColumnType<K8sNodesRowData>[];
	}

	return columnsConfig as ColumnType<K8sNodesRowData>[];
};

const getGroupByEle = (
	node: K8sNodesData,
	groupBy: IBuilderQuery['groupBy'],
): React.ReactNode => {
	const groupByValues: string[] = [];

	groupBy.forEach((group) => {
		groupByValues.push(node.meta[group.key as keyof typeof node.meta]);
	});

	return (
		<div className="pod-group">
			{groupByValues.map((value) => (
				<Tag key={value} color={Color.BG_SLATE_400} className="pod-group-tag-item">
					{value === '' ? '<no-value>' : value}
				</Tag>
			))}
		</div>
	);
};

export const formatDataForTable = (
	data: K8sNodesData[],
	groupBy: IBuilderQuery['groupBy'],
): K8sNodesRowData[] =>
	data.map((node, index) => ({
		key: `${node.nodeUID}-${index}`,
		nodeUID: node.nodeUID || '',
		nodeName: (
			<Tooltip title={node.meta.k8s_node_name}>
				{node.meta.k8s_node_name || ''}
			</Tooltip>
		),
		clusterName: node.meta.k8s_cluster_name,
		cpu: (
			<ValidateColumnValueWrapper value={node.nodeCPUUsage}>
				{node.nodeCPUUsage}
			</ValidateColumnValueWrapper>
		),
		memory: (
			<ValidateColumnValueWrapper value={node.nodeMemoryUsage}>
				{formatBytes(node.nodeMemoryUsage)}
			</ValidateColumnValueWrapper>
		),
		cpu_allocatable: (
			<ValidateColumnValueWrapper value={node.nodeCPUAllocatable}>
				{node.nodeCPUAllocatable}
			</ValidateColumnValueWrapper>
		),
		memory_allocatable: (
			<ValidateColumnValueWrapper value={node.nodeMemoryAllocatable}>
				{formatBytes(node.nodeMemoryAllocatable)}
			</ValidateColumnValueWrapper>
		),
		nodeGroup: getGroupByEle(node, groupBy),
		meta: node.meta,
		...node.meta,
		groupedByMeta: node.meta,
	}));
