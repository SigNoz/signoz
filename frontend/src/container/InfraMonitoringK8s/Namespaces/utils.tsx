import { ColumnType } from 'antd/es/table';
import {
	K8sNamespacesData,
	K8sNamespacesListPayload,
} from 'api/infraMonitoring/getK8sNamespacesList';

import { IEntityColumn } from '../utils';

export const defaultAddedColumns: IEntityColumn[] = [
	{
		label: 'Namespace Status',
		value: 'NamespaceStatus',
		id: 'NamespaceStatus',
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

export interface K8sNamespacesRowData {
	key: string;
	namespaceUID: string;
	namespaceName: string;
	cpuUsage: React.ReactNode;
	memoryUsage: React.ReactNode;
	podsCount: number;
	containerRestarts: React.ReactNode;
}

export const getK8sNamespacesListQuery = (): K8sNamespacesListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

const columnsConfig = [
	{
		title: <div className="column-header-left">Namespace</div>,
		dataIndex: 'namespaceName',
		key: 'namespaceName',
		ellipsis: true,
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">CPU Utilization (cores)</div>,
		dataIndex: 'cpuUsage',
		key: 'cpuUsage',
		width: 100,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Memory Utilization (bytes)</div>,
		dataIndex: 'memoryUsage',
		key: 'memoryUsage',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Container Restarts</div>,
		dataIndex: 'containerRestarts',
		key: 'containerRestarts',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Pods count by phase</div>,
		dataIndex: 'podsCounts',
		key: 'podsCount',
		width: 50,
		sorter: true,
		align: 'left',
	},
];

export const getK8sNamespacesListColumns = (): ColumnType<K8sNamespacesRowData>[] =>
	columnsConfig as ColumnType<K8sNamespacesRowData>[];

export const formatDataForTable = (
	data: K8sNamespacesData[],
): K8sNamespacesRowData[] =>
	data.map((namespace, index) => ({
		key: `${namespace.namespaceName}-${index}`,
		namespaceUID: namespace.meta.k8s_namespace_uid,
		namespaceName: namespace.namespaceName,
		cpuUsage: namespace.cpuUsage,
		memoryUsage: namespace.memoryUsage,
		podsCount: namespace.cpuUsage,
		containerRestarts: namespace.cpuUsage,
	}));
