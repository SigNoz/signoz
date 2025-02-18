import { Color } from '@signozhq/design-tokens';
import { Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sJobsData,
	K8sJobsListPayload,
} from 'api/infraMonitoring/getK8sJobsList';
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
		label: 'Job Name',
		value: 'jobName',
		id: 'jobName',
		canRemove: false,
	},
	{
		label: 'Namespace Name',
		value: 'namespaceName',
		id: 'namespaceName',
		canRemove: false,
	},
	{
		label: 'Successful',
		value: 'successful_pods',
		id: 'successful_pods',
		canRemove: false,
	},
	{
		label: 'Failed',
		value: 'failed_pods',
		id: 'failed_pods',
		canRemove: false,
	},
	{
		label: 'Desired Successful',
		value: 'desired_successful_pods',
		id: 'desired_successful_pods',
		canRemove: false,
	},
	{
		label: 'Active',
		value: 'active_pods',
		id: 'active_pods',
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

export interface K8sJobsRowData {
	key: string;
	jobUID: string;
	jobName: React.ReactNode;
	namespaceName: React.ReactNode;
	successful_pods: React.ReactNode;
	failed_pods: React.ReactNode;
	active_pods: React.ReactNode;
	desired_successful_pods: React.ReactNode;
	cpu_request: React.ReactNode;
	cpu_limit: React.ReactNode;
	cpu: React.ReactNode;
	memory_request: React.ReactNode;
	memory_limit: React.ReactNode;
	memory: React.ReactNode;
	groupedByMeta?: any;
}

const jobGroupColumnConfig = {
	title: (
		<div className="column-header entity-group-header">
			<Group size={14} /> JOB GROUP
		</div>
	),
	dataIndex: 'jobGroup',
	key: 'jobGroup',
	ellipsis: true,
	width: 150,
	align: 'left',
	sorter: false,
	className: 'column entity-group-header',
};

export const getK8sJobsListQuery = (): K8sJobsListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

const columnProgressBarClassName = 'column-progress-bar';

const columnsConfig = [
	{
		title: <div className="column-header-left job-name-header">Job Name</div>,
		dataIndex: 'jobName',
		key: 'jobName',
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
		title: <div className="column-header small-col">Successful</div>,
		dataIndex: 'successful_pods',
		key: 'successful_pods',
		ellipsis: true,
		sorter: true,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-header small-col">Failed</div>,
		dataIndex: 'failed_pods',
		key: 'failed_pods',
		sorter: true,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-header small-col">Desired Successful</div>,
		dataIndex: 'desired_successful_pods',
		key: 'desired_successful_pods',
		ellipsis: true,
		sorter: true,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-header small-col">Active</div>,
		dataIndex: 'active_pods',
		key: 'active_pods',
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

export const getK8sJobsListColumns = (
	groupBy: IBuilderQuery['groupBy'],
): ColumnType<K8sJobsRowData>[] => {
	if (groupBy.length > 0) {
		const filteredColumns = [...columnsConfig].filter(
			(column) => column.key !== 'jobName',
		);
		filteredColumns.unshift(jobGroupColumnConfig);
		return filteredColumns as ColumnType<K8sJobsRowData>[];
	}

	return columnsConfig as ColumnType<K8sJobsRowData>[];
};

const getGroupByEle = (
	job: K8sJobsData,
	groupBy: IBuilderQuery['groupBy'],
): React.ReactNode => {
	const groupByValues: string[] = [];

	groupBy.forEach((group) => {
		groupByValues.push(job.meta[group.key as keyof typeof job.meta]);
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
	data: K8sJobsData[],
	groupBy: IBuilderQuery['groupBy'],
): K8sJobsRowData[] =>
	data.map((job, index) => ({
		key: index.toString(),
		jobUID: job.jobName,
		jobName: (
			<Tooltip title={job.meta.k8s_job_name}>
				{job.meta.k8s_job_name || ''}
			</Tooltip>
		),
		namespaceName: (
			<Tooltip title={job.meta.k8s_namespace_name}>
				{job.meta.k8s_namespace_name || ''}
			</Tooltip>
		),
		cpu_request: (
			<ValidateColumnValueWrapper
				value={job.cpuRequest}
				entity={K8sCategory.JOBS}
				attribute="CPU Request"
			>
				<div className="progress-container">
					<EntityProgressBar value={job.cpuRequest} type="request" />
				</div>
			</ValidateColumnValueWrapper>
		),
		cpu_limit: (
			<ValidateColumnValueWrapper
				value={job.cpuLimit}
				entity={K8sCategory.JOBS}
				attribute="CPU Limit"
			>
				<div className="progress-container">
					<EntityProgressBar value={job.cpuLimit} type="limit" />
				</div>
			</ValidateColumnValueWrapper>
		),
		cpu: (
			<ValidateColumnValueWrapper value={job.cpuUsage}>
				{job.cpuUsage}
			</ValidateColumnValueWrapper>
		),
		memory_request: (
			<ValidateColumnValueWrapper
				value={job.memoryRequest}
				entity={K8sCategory.JOBS}
				attribute="Memory Request"
			>
				<div className="progress-container">
					<EntityProgressBar value={job.memoryRequest} type="request" />
				</div>
			</ValidateColumnValueWrapper>
		),
		memory_limit: (
			<ValidateColumnValueWrapper
				value={job.memoryLimit}
				entity={K8sCategory.JOBS}
				attribute="Memory Limit"
			>
				<div className="progress-container">
					<EntityProgressBar value={job.memoryLimit} type="limit" />
				</div>
			</ValidateColumnValueWrapper>
		),
		memory: (
			<ValidateColumnValueWrapper value={job.memoryUsage}>
				{formatBytes(job.memoryUsage)}
			</ValidateColumnValueWrapper>
		),
		successful_pods: (
			<ValidateColumnValueWrapper value={job.successfulPods}>
				{job.successfulPods}
			</ValidateColumnValueWrapper>
		),
		desired_successful_pods: (
			<ValidateColumnValueWrapper value={job.desiredSuccessfulPods}>
				{job.desiredSuccessfulPods}
			</ValidateColumnValueWrapper>
		),
		failed_pods: (
			<ValidateColumnValueWrapper value={job.failedPods}>
				{job.failedPods}
			</ValidateColumnValueWrapper>
		),
		active_pods: (
			<ValidateColumnValueWrapper value={job.activePods}>
				{job.activePods}
			</ValidateColumnValueWrapper>
		),
		jobGroup: getGroupByEle(job, groupBy),
		meta: job.meta,
		...job.meta,
		groupedByMeta: job.meta,
	}));
