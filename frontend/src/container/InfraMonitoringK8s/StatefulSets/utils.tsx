import { Color } from '@signozhq/design-tokens';
import { Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sStatefulSetsData,
	K8sStatefulSetsListPayload,
} from 'api/infraMonitoring/getsK8sStatefulSetsList';
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
		label: 'StatefulSet Name',
		value: 'statefulsetName',
		id: 'statefulsetName',
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
		value: 'available_pods',
		id: 'available_pods',
		canRemove: false,
	},
	{
		label: 'Desired',
		value: 'desired_pods',
		id: 'desired_pods',
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

export interface K8sStatefulSetsRowData {
	key: string;
	statefulsetUID: string;
	statefulsetName: React.ReactNode;
	cpu_request: React.ReactNode;
	cpu_limit: React.ReactNode;
	cpu: React.ReactNode;
	memory_request: React.ReactNode;
	memory_limit: React.ReactNode;
	memory: React.ReactNode;
	desired_pods: React.ReactNode;
	available_pods: React.ReactNode;
	namespaceName: React.ReactNode;
	groupedByMeta?: any;
}

const statefulSetGroupColumnConfig = {
	title: (
		<div className="column-header entity-group-header">
			<Group size={14} /> STATEFULSET GROUP
		</div>
	),
	dataIndex: 'statefulSetGroup',
	key: 'statefulSetGroup',
	ellipsis: true,
	width: 150,
	align: 'left',
	sorter: false,
	className: 'column entity-group-header',
};

export const getK8sStatefulSetsListQuery = (): K8sStatefulSetsListPayload => ({
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
			<div className="column-header-left statefulset-name-header">
				StatefulSet Name
			</div>
		),
		dataIndex: 'statefulsetName',
		key: 'statefulsetName',
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
		dataIndex: 'available_pods',
		key: 'available_pods',
		ellipsis: true,
		sorter: true,
		align: 'left',
		className: `column small-col`,
	},
	{
		title: <div className="column-header small-col">Desired</div>,
		dataIndex: 'desired_pods',
		key: 'desired_pods',
		sorter: true,
		align: 'left',
		className: `column small-col`,
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

export const getK8sStatefulSetsListColumns = (
	groupBy: IBuilderQuery['groupBy'],
): ColumnType<K8sStatefulSetsRowData>[] => {
	if (groupBy.length > 0) {
		const filteredColumns = [...columnsConfig].filter(
			(column) => column.key !== 'statefulsetName',
		);
		filteredColumns.unshift(statefulSetGroupColumnConfig);
		return filteredColumns as ColumnType<K8sStatefulSetsRowData>[];
	}

	return columnsConfig as ColumnType<K8sStatefulSetsRowData>[];
};

const getGroupByEle = (
	statefulSet: K8sStatefulSetsData,
	groupBy: IBuilderQuery['groupBy'],
): React.ReactNode => {
	const groupByValues: string[] = [];

	groupBy.forEach((group) => {
		groupByValues.push(
			statefulSet.meta[group.key as keyof typeof statefulSet.meta],
		);
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
	data: K8sStatefulSetsData[],
	groupBy: IBuilderQuery['groupBy'],
): K8sStatefulSetsRowData[] =>
	data.map((statefulSet, index) => ({
		key: index.toString(),
		statefulsetUID: statefulSet.statefulSetName,
		statefulsetName: (
			<Tooltip title={statefulSet.meta.k8s_statefulset_name}>
				{statefulSet.meta.k8s_statefulset_name || ''}
			</Tooltip>
		),
		namespaceName: (
			<Tooltip title={statefulSet.meta.k8s_namespace_name}>
				{statefulSet.meta.k8s_namespace_name || ''}
			</Tooltip>
		),
		cpu_request: (
			<ValidateColumnValueWrapper
				value={statefulSet.cpuRequest}
				entity={K8sCategory.STATEFULSETS}
				attribute="CPU Request"
			>
				<div className="progress-container">
					<EntityProgressBar value={statefulSet.cpuRequest} type="request" />
				</div>
			</ValidateColumnValueWrapper>
		),
		cpu_limit: (
			<ValidateColumnValueWrapper
				value={statefulSet.cpuLimit}
				entity={K8sCategory.STATEFULSETS}
				attribute="CPU Limit"
			>
				<div className="progress-container">
					<EntityProgressBar value={statefulSet.cpuLimit} type="limit" />
				</div>
			</ValidateColumnValueWrapper>
		),
		cpu: (
			<ValidateColumnValueWrapper value={statefulSet.cpuUsage}>
				{statefulSet.cpuUsage}
			</ValidateColumnValueWrapper>
		),
		memory_request: (
			<ValidateColumnValueWrapper
				value={statefulSet.memoryRequest}
				entity={K8sCategory.STATEFULSETS}
				attribute="Memory Request"
			>
				<div className="progress-container">
					<EntityProgressBar value={statefulSet.memoryRequest} type="request" />
				</div>
			</ValidateColumnValueWrapper>
		),
		memory_limit: (
			<ValidateColumnValueWrapper
				value={statefulSet.memoryLimit}
				entity={K8sCategory.STATEFULSETS}
				attribute="Memory Limit"
			>
				<div className="progress-container">
					<EntityProgressBar value={statefulSet.memoryLimit} type="limit" />
				</div>
			</ValidateColumnValueWrapper>
		),
		memory: (
			<ValidateColumnValueWrapper value={statefulSet.memoryUsage}>
				{formatBytes(statefulSet.memoryUsage)}
			</ValidateColumnValueWrapper>
		),
		available_pods: (
			<ValidateColumnValueWrapper value={statefulSet.availablePods}>
				{statefulSet.availablePods}
			</ValidateColumnValueWrapper>
		),
		desired_pods: (
			<ValidateColumnValueWrapper value={statefulSet.desiredPods}>
				{statefulSet.desiredPods}
			</ValidateColumnValueWrapper>
		),
		statefulSetGroup: getGroupByEle(statefulSet, groupBy),
		meta: statefulSet.meta,
		...statefulSet.meta,
		groupedByMeta: statefulSet.meta,
	}));
