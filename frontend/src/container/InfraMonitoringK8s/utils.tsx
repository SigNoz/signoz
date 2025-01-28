/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable sonarjs/cognitive-complexity */
import './InfraMonitoringK8s.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import get from 'api/browser/localstorage/get';
import set from 'api/browser/localstorage/set';
import {
	K8sPodsData,
	K8sPodsListPayload,
} from 'api/infraMonitoring/getK8sPodsList';
import { Group } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import {
	EntityProgressBar,
	formatBytes,
	ValidateColumnValueWrapper,
} from './commonUtils';
import { DEFAULT_PAGE_SIZE, K8sCategory } from './constants';

export interface IEntityColumn {
	label: string;
	value: string;
	id: string;
	canRemove: boolean;
}

const columnProgressBarClassName = 'column-progress-bar';

export const defaultAddedColumns: IEntityColumn[] = [
	{
		label: 'Pod name',
		value: 'podName',
		id: 'podName',
		canRemove: false,
	},
	{
		label: 'CPU Req Usage (%)',
		value: 'cpu_request',
		id: 'cpu_request',
		canRemove: false,
	},
	{
		label: 'CPU Limit Usage (%)',
		value: 'cpu_limit',
		id: 'cpu_limit',
		canRemove: false,
	},
	{
		label: 'CPU Usage (cores)',
		value: 'cpu',
		id: 'cpu',
		canRemove: false,
	},
	{
		label: 'Mem Req Usage (%)',
		value: 'memory_request',
		id: 'memory_request',
		canRemove: false,
	},
	{
		label: 'Mem Limit Usage (%)',
		value: 'memory_limit',
		id: 'memory_limit',
		canRemove: false,
	},
	{
		label: 'Mem Usage',
		value: 'memory',
		id: 'memory',
		canRemove: false,
	},
	// TODO - Re-enable the column once backend issue is fixed
	// {
	// 	label: 'Restarts',
	// 	value: 'restarts',
	// 	id: 'restarts',
	// 	canRemove: false,
	// },
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
	restarts: React.ReactNode;
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
		<div className="column-header entity-group-header">
			<Group size={14} /> POD GROUP
		</div>
	),
	dataIndex: 'podGroup',
	key: 'podGroup',
	ellipsis: true,
	width: 180,
	sorter: false,
	className: 'column entity-group-header',
};

export const dummyColumnConfig = {
	title: <div className="column-header dummy-column">&nbsp;</div>,
	dataIndex: 'dummy',
	key: 'dummy',
	width: 40,
	sorter: false,
	align: 'left',
	className: 'column column-dummy',
};

const columnsConfig = [
	{
		title: <div className="column-header pod-name-header">Pod Name</div>,
		dataIndex: 'podName',
		key: 'podName',
		width: 180,
		ellipsis: true,
		sorter: false,
		className: 'column column-pod-name',
	},
	{
		title: <div className="column-header med-col">CPU Req Usage (%)</div>,
		dataIndex: 'cpu_request',
		key: 'cpu_request',
		width: 180,
		ellipsis: true,
		sorter: true,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-header med-col">CPU Limit Usage (%)</div>,
		dataIndex: 'cpu_limit',
		key: 'cpu_limit',
		width: 120,
		sorter: true,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-header">CPU Usage (cores)</div>,
		dataIndex: 'cpu',
		key: 'cpu',
		width: 80,
		sorter: true,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-heade med-col">Mem Req Usage (%)</div>,
		dataIndex: 'memory_request',
		key: 'memory_request',
		width: 120,
		sorter: true,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-header med-col">Mem Limit Usage (%)</div>,
		dataIndex: 'memory_limit',
		key: 'memory_limit',
		width: 120,
		sorter: true,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-header">Mem Usage</div>,
		dataIndex: 'memory',
		key: 'memory',
		width: 80,
		ellipsis: true,
		sorter: true,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	// TODO - Re-enable the column once backend issue is fixed
	// {
	// 	title: (
	// 		<div className="column-header">
	// 			<Tooltip title="Container Restarts">Restarts</Tooltip>
	// 		</div>
	// 	),
	// 	dataIndex: 'restarts',
	// 	key: 'restarts',
	// 	width: 40,
	// 	ellipsis: true,
	// 	sorter: true,
	// 	align: 'left',
	// 	className: `column ${columnProgressBarClassName}`,
	// },
];

export const namespaceColumnConfig = {
	title: <div className="column-header">Namespace</div>,
	dataIndex: 'namespace',
	key: 'namespace',
	width: 100,
	sorter: false,
	ellipsis: true,
	align: 'left',
	className: 'column column-namespace',
};

export const nodeColumnConfig = {
	title: <div className="column-header">Node</div>,
	dataIndex: 'node',
	key: 'node',
	width: 100,
	sorter: false,
	ellipsis: true,
	align: 'left',
	className: 'column column-node',
};

export const clusterColumnConfig = {
	title: <div className="column-header">Cluster</div>,
	dataIndex: 'cluster',
	key: 'cluster',
	width: 100,
	sorter: false,
	ellipsis: true,
	align: 'left',
	className: 'column column-cluster',
};

export const columnConfigMap = {
	namespace: namespaceColumnConfig,
	node: nodeColumnConfig,
	cluster: clusterColumnConfig,
};

export const getK8sPodsListColumns = (
	addedColumns: IEntityColumn[],
	groupBy: IBuilderQuery['groupBy'],
): ColumnType<K8sPodsRowData>[] => {
	const updatedColumnsConfig = [...columnsConfig];

	// eslint-disable-next-line no-restricted-syntax
	for (const column of addedColumns) {
		const config = columnConfigMap[column.id as keyof typeof columnConfigMap];
		if (config) {
			updatedColumnsConfig.push(config);
		}
	}

	if (groupBy.length > 0) {
		const filteredColumns = [...updatedColumnsConfig].filter(
			(column) => column.key !== 'podName',
		);

		filteredColumns.unshift(podGroupColumnConfig);

		return filteredColumns as ColumnType<K8sPodsRowData>[];
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
				<Tag key={value} color={Color.BG_SLATE_400} className="pod-group-tag-item">
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
			<Tooltip title={pod.meta.k8s_pod_name || ''}>
				{pod.meta.k8s_pod_name || ''}
			</Tooltip>
		),
		podUID: pod.podUID || '',
		cpu_request: (
			<ValidateColumnValueWrapper
				value={pod.podCPURequest}
				entity={K8sCategory.PODS}
				attribute="CPU Request"
			>
				<div className="progress-container">
					<EntityProgressBar value={pod.podCPURequest} type="request" />
				</div>
			</ValidateColumnValueWrapper>
		),
		cpu_limit: (
			<ValidateColumnValueWrapper
				value={pod.podCPULimit}
				entity={K8sCategory.PODS}
				attribute="CPU Limit"
			>
				<div className="progress-container">
					<EntityProgressBar value={pod.podCPULimit} type="limit" />
				</div>
			</ValidateColumnValueWrapper>
		),
		cpu: (
			<ValidateColumnValueWrapper value={pod.podCPU}>
				{pod.podCPU}
			</ValidateColumnValueWrapper>
		),
		memory_request: (
			<ValidateColumnValueWrapper
				value={pod.podMemoryRequest}
				entity={K8sCategory.PODS}
				attribute="Memory Request"
			>
				<div className="progress-container">
					<EntityProgressBar value={pod.podMemoryRequest} type="request" />
				</div>
			</ValidateColumnValueWrapper>
		),
		memory_limit: (
			<ValidateColumnValueWrapper
				value={pod.podMemoryLimit}
				entity={K8sCategory.PODS}
				attribute="Memory Limit"
			>
				<div className="progress-container">
					<EntityProgressBar value={pod.podMemoryLimit} type="limit" />
				</div>
			</ValidateColumnValueWrapper>
		),
		memory: (
			<ValidateColumnValueWrapper value={pod.podMemory}>
				{formatBytes(pod.podMemory)}
			</ValidateColumnValueWrapper>
		),
		restarts: (
			<ValidateColumnValueWrapper value={pod.restartCount}>
				{pod.restartCount}
			</ValidateColumnValueWrapper>
		),
		namespace: pod.meta.k8s_namespace_name,
		node: pod.meta.k8s_node_name,
		cluster: pod.meta.k8s_job_name,
		meta: pod.meta,
		podGroup: getGroupByEle(pod, groupBy),
		...pod.meta,
		groupedByMeta: pod.meta,
	}));

/**
 * Custom hook to manage the page size for a table.
 * The page size is stored in local storage and is retrieved on initialization.
 * It also provides a function to update the page size and save it to local storage.
 */
export const usePageSize = (
	key: string,
): { pageSize: number; setPageSize: (pageSize: number) => void } => {
	const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

	// Memoized key for accessing page size in local storage
	const storageKey = useMemo(() => `k8s-${key}-page-size`, [key]);

	useEffect(() => {
		// Retrieve the stored page size from local storage on component mount
		const storageValue = get(storageKey);
		if (storageValue) {
			setPageSize(parseInt(storageValue, 10));
		}
	}, [storageKey]);

	// Function to update the page size and save it to local storage
	const handlePageSizeChange = useCallback(
		(value: number) => {
			setPageSize(value);
			set(storageKey, value.toString());
		},
		[storageKey],
	);

	return {
		pageSize,
		setPageSize: handlePageSizeChange,
	};
};
