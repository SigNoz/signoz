import { Color } from '@signozhq/design-tokens';
import { Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sDaemonSetsData,
	K8sDaemonSetsListPayload,
} from 'api/infraMonitoring/getK8sDaemonSetsList';
import { Group } from 'lucide-react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import {
	EntityProgressBar,
	formatBytes,
	ValidateColumnValueWrapper,
} from '../commonUtils';
import { K8sCategory } from '../constants';
import { IEntityColumn } from '../utils';

export const defaultAddedColumns: IEntityColumn[] = [
	{
		label: 'DaemonSet Name',
		value: 'daemonsetName',
		id: 'daemonsetName',
		canRemove: false,
	},
	{
		label: 'Namespace Name',
		value: 'namespaceName',
		id: 'namespaceName',
		canRemove: false,
	},
	{
		label: 'Available',
		value: 'available_nodes',
		id: 'available_nodes',
		canRemove: false,
	},
	{
		label: 'Desired',
		value: 'desired_nodes',
		id: 'desired_nodes',
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
];

export interface K8sDaemonSetsRowData {
	key: string;
	daemonsetUID: string;
	daemonsetName: React.ReactNode;
	cpu_request: React.ReactNode;
	cpu_limit: React.ReactNode;
	cpu: React.ReactNode;
	memory_request: React.ReactNode;
	memory_limit: React.ReactNode;
	memory: React.ReactNode;
	desired_nodes: React.ReactNode;
	available_nodes: React.ReactNode;
	namespaceName: React.ReactNode;
	groupedByMeta?: any;
}

const daemonSetGroupColumnConfig = {
	title: (
		<div className="column-header entity-group-header">
			<Group size={14} /> DAEMONSET GROUP
		</div>
	),
	dataIndex: 'daemonSetGroup',
	key: 'daemonSetGroup',
	ellipsis: true,
	width: 150,
	align: 'left',
	sorter: false,
	className: 'column entity-group-header',
};

export const getK8sDaemonSetsListQuery = (): K8sDaemonSetsListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

const columnProgressBarClassName = 'column-progress-bar';

const columnsConfig = [
	{
		title: (
			<div className="column-header-left daemonset-name-header">
				DaemonSet Name
			</div>
		),
		dataIndex: 'daemonsetName',
		key: 'daemonsetName',
		ellipsis: true,
		width: 80,
		sorter: false,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left namespace-name-header">
				Namespace Name
			</div>
		),
		dataIndex: 'namespaceName',
		key: 'namespaceName',
		ellipsis: true,
		width: 80,
		sorter: false,
		align: 'left',
	},
	{
		title: <div className="column-header small-col">Available</div>,
		dataIndex: 'available_nodes',
		key: 'available_nodes',
		ellipsis: true,
		sorter: true,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-header small-col">Desired</div>,
		dataIndex: 'desired_nodes',
		key: 'desired_nodes',
		sorter: true,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
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
		title: <div className="column-header small-col">CPU Usage (cores)</div>,
		dataIndex: 'cpu',
		key: 'cpu',
		width: 80,
		sorter: true,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-header med-col">Mem Req Usage (%)</div>,
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
		title: <div className="column-header small-col">Mem Usage</div>,
		dataIndex: 'memory',
		key: 'memory',
		width: 80,
		ellipsis: true,
		sorter: true,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
];

export const getK8sDaemonSetsListColumns = (
	groupBy: IBuilderQuery['groupBy'],
): ColumnType<K8sDaemonSetsRowData>[] => {
	if (groupBy.length > 0) {
		const filteredColumns = [...columnsConfig].filter(
			(column) => column.key !== 'daemonsetName',
		);
		filteredColumns.unshift(daemonSetGroupColumnConfig);
		return filteredColumns as ColumnType<K8sDaemonSetsRowData>[];
	}

	return columnsConfig as ColumnType<K8sDaemonSetsRowData>[];
};

const getGroupByEle = (
	daemonSet: K8sDaemonSetsData,
	groupBy: IBuilderQuery['groupBy'],
): React.ReactNode => {
	const groupByValues: string[] = [];

	groupBy.forEach((group) => {
		groupByValues.push(daemonSet.meta[group.key as keyof typeof daemonSet.meta]);
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
	data: K8sDaemonSetsData[],
	groupBy: IBuilderQuery['groupBy'],
): K8sDaemonSetsRowData[] =>
	data.map((daemonSet, index) => ({
		key: index.toString(),
		daemonsetUID: daemonSet.daemonSetName,
		daemonsetName: (
			<Tooltip title={daemonSet.meta.k8s_daemonset_name}>
				{daemonSet.meta.k8s_daemonset_name || ''}
			</Tooltip>
		),
		namespaceName: (
			<Tooltip title={daemonSet.meta.k8s_namespace_name}>
				{daemonSet.meta.k8s_namespace_name || ''}
			</Tooltip>
		),
		cpu_request: (
			<ValidateColumnValueWrapper
				value={daemonSet.cpuRequest}
				entity={K8sCategory.DAEMONSETS}
				attribute="CPU Request"
			>
				<div className="progress-container">
					<EntityProgressBar value={daemonSet.cpuRequest} type="request" />
				</div>
			</ValidateColumnValueWrapper>
		),
		cpu_limit: (
			<ValidateColumnValueWrapper
				value={daemonSet.cpuLimit}
				entity={K8sCategory.DAEMONSETS}
				attribute="CPU Limit"
			>
				<div className="progress-container">
					<EntityProgressBar value={daemonSet.cpuLimit} type="limit" />
				</div>
			</ValidateColumnValueWrapper>
		),
		cpu: (
			<ValidateColumnValueWrapper value={daemonSet.cpuUsage}>
				{daemonSet.cpuUsage}
			</ValidateColumnValueWrapper>
		),
		memory_request: (
			<ValidateColumnValueWrapper
				value={daemonSet.memoryRequest}
				entity={K8sCategory.DAEMONSETS}
				attribute="Memory Request"
			>
				<div className="progress-container">
					<EntityProgressBar value={daemonSet.memoryRequest} type="request" />
				</div>
			</ValidateColumnValueWrapper>
		),
		memory_limit: (
			<ValidateColumnValueWrapper
				value={daemonSet.memoryLimit}
				entity={K8sCategory.DAEMONSETS}
				attribute="Memory Limit"
			>
				<div className="progress-container">
					<EntityProgressBar value={daemonSet.memoryLimit} type="limit" />
				</div>
			</ValidateColumnValueWrapper>
		),
		memory: (
			<ValidateColumnValueWrapper value={daemonSet.memoryUsage}>
				{formatBytes(daemonSet.memoryUsage)}
			</ValidateColumnValueWrapper>
		),
		available_nodes: (
			<ValidateColumnValueWrapper value={daemonSet.availableNodes}>
				{daemonSet.availableNodes}
			</ValidateColumnValueWrapper>
		),
		desired_nodes: (
			<ValidateColumnValueWrapper value={daemonSet.desiredNodes}>
				{daemonSet.desiredNodes}
			</ValidateColumnValueWrapper>
		),
		daemonSetGroup: getGroupByEle(daemonSet, groupBy),
		meta: daemonSet.meta,
		...daemonSet.meta,
		groupedByMeta: daemonSet.meta,
	}));
