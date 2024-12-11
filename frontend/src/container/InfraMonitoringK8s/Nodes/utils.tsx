import { ColumnType } from 'antd/es/table';
import {
	K8sNodesData,
	K8sNodesListPayload,
} from 'api/infraMonitoring/getK8sNodesList';

import { IEntityColumn } from '../utils';

export const defaultAddedColumns: IEntityColumn[] = [
	{
		label: 'Node Status',
		value: 'nodeStatus',
		id: 'nodeStatus',
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
		label: 'Memory Allocatable (bytes)',
		value: 'memoryAllocatable',
		id: 'memoryAllocatable',
		canRemove: false,
	},
	{
		label: 'Pods count by phase',
		value: 'podsCount',
		id: 'podsCount',
		canRemove: false,
	},
];

export interface K8sNodesRowData {
	key: string;
	nodeUID: string;
	nodeStatus: string;
	cpuUtilization: React.ReactNode;
	cpuAllocatable: React.ReactNode;
	memoryUtilization: React.ReactNode;
	memoryAllocatable: React.ReactNode;
	podsCount: number;
}

export const getK8sNodesListQuery = (): K8sNodesListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

const columnsConfig = [
	{
		title: <div className="column-header-left">Node Status</div>,
		dataIndex: 'nodeStatus',
		key: 'nodeStatus',
		ellipsis: true,
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">CPU Utilization (cores)</div>,
		dataIndex: 'cpuUtilization',
		key: 'cpuUtilization',
		width: 100,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">CPU Allocatable (cores)</div>,
		dataIndex: 'cpuAllocatable',
		key: 'cpuAllocatable',
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
		title: <div className="column-header-left">Memory Allocatable (bytes)</div>,
		dataIndex: 'memoryAllocatable',
		key: 'memoryAllocatable',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Pods count by phase</div>,
		dataIndex: 'containerRestarts',
		key: 'containerRestarts',
		width: 50,
		sorter: true,
		align: 'left',
	},
];

export const getK8sNodesListColumns = (): ColumnType<K8sNodesRowData>[] =>
	columnsConfig as ColumnType<K8sNodesRowData>[];

export const formatDataForTable = (data: K8sNodesData[]): K8sNodesRowData[] =>
	data.map((node, index) => ({
		key: `${node.nodeUID}-${index}`,
		nodeUID: node.nodeUID || '',
		cpuUtilization: node.nodeCPUUsage,
		memoryUtilization: node.nodeMemoryUsage,
		cpuAllocatable: node.nodeCPUAllocatable,
		memoryAllocatable: node.nodeMemoryAllocatable,
		nodeStatus: node.meta.k8s_node_name,
		podsCount: node.nodeCPUAllocatable,
	}));
