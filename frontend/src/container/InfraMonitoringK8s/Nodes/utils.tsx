import { Button, Tag } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sNodesData,
	K8sNodesListPayload,
} from 'api/infraMonitoring/getK8sNodesList';
import { ChevronRight, Group } from 'lucide-react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { IEntityColumn } from '../utils';

export const defaultAddedColumns: IEntityColumn[] = [
	{
		label: 'Node Name',
		value: 'nodeStatus',
		id: 'nodeStatus',
		canRemove: false,
	},
	{
		label: 'Cluster Name',
		value: 'clusterStatus',
		id: 'clusterStatus',
		canRemove: false,
	},
	{
		label: 'CPU Utilization (cores)',
		value: 'cpuUtilization',
		id: 'cpuUtilization',
		canRemove: false,
	},
	{
		label: 'CPU Allocatable (cores)',
		value: 'cpuAllocatable',
		id: 'cpuAllocatable',
		canRemove: false,
	},
	{
		label: 'Memory Utilization (bytes)',
		value: 'memoryUtilization',
		id: 'memoryUtilization',
		canRemove: false,
	},
	{
		label: 'Memory Allocatable (bytes)',
		value: 'memoryAllocatable',
		id: 'memoryAllocatable',
		canRemove: false,
	},
];

export interface K8sNodesRowData {
	key: string;
	nodeUID: string;
	nodeName: string;
	clusterName: string;
	cpuUtilization: React.ReactNode;
	cpuAllocatable: React.ReactNode;
	memoryUtilization: React.ReactNode;
	memoryAllocatable: React.ReactNode;
}

const podGroupColumnConfig = {
	title: (
		<div className="column-header node-group-header">
			<Group size={14} /> NODE GROUP
		</div>
	),
	dataIndex: 'nodeGroup',
	key: 'nodeGroup',
	ellipsis: true,
	width: 150,
	align: 'left',
	sorter: false,
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
		title: <div className="column-header-left">Node Name</div>,
		dataIndex: 'nodeName',
		key: 'nodeName',
		ellipsis: true,
		width: 150,
		sorter: true,
		align: 'left',
	},
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
		dataIndex: 'cpuUtilization',
		key: 'cpuUtilization',
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
		dataIndex: 'memoryUtilization',
		key: 'memoryUtilization',
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

export const getK8sNodesListColumns = (
	groupBy: IBuilderQuery['groupBy'],
): ColumnType<K8sNodesRowData>[] => {
	if (groupBy.length > 0) {
		const filteredColumns = [...columnsConfig].filter(
			(column) => column.key !== 'nodeName',
		);
		filteredColumns.unshift(podGroupColumnConfig);
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
			<div className="expand-group">
				<Button
					type="text"
					className="expand-group-icon periscope-btn ghost"
					icon={<ChevronRight size={14} />}
				/>
			</div>

			{groupByValues.map((value) => (
				<Tag key={value} color="#1D212D" className="pod-group-tag-item">
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
		nodeName: node.meta.k8s_node_name,
		clusterName: node.meta.k8s_cluster_name,
		cpuUtilization: node.nodeCPUUsage,
		memoryUtilization: node.nodeMemoryUsage,
		cpuAllocatable: node.nodeCPUAllocatable,
		memoryAllocatable: node.nodeMemoryAllocatable,
		nodeGroup: getGroupByEle(node, groupBy),
	}));
