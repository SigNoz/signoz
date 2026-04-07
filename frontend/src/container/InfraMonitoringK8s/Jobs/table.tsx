import { TableColumnType as ColumnType, Tooltip } from 'antd';
import { Group } from 'lucide-react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { K8sRenderedRowData } from '../Base/K8sBaseList';
import { IEntityColumn } from '../Base/useInfraMonitoringTableColumnsStore';
import { getGroupByEl, getGroupedByMeta, getRowKey } from '../Base/utils';
import {
	EntityProgressBar,
	formatBytes,
	ValidateColumnValueWrapper,
} from '../commonUtils';
import { K8sCategory } from '../constants';
import { K8sJobsData } from './api';

import styles from './table.module.scss';

export const k8sJobsColumns: IEntityColumn[] = [
	{
		label: 'Job Group',
		value: 'jobGroup',
		id: 'jobGroup',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'hidden-on-collapse',
	},
	{
		label: 'Job Name',
		value: 'jobName',
		id: 'jobName',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'hidden-on-expand',
	},
	{
		label: 'Namespace Name',
		value: 'namespaceName',
		id: 'namespaceName',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Successful',
		value: 'successful_pods',
		id: 'successful_pods',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Failed',
		value: 'failed_pods',
		id: 'failed_pods',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Desired Successful',
		value: 'desired_successful_pods',
		id: 'desired_successful_pods',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Active',
		value: 'active_pods',
		id: 'active_pods',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'CPU Req Usage (%)',
		value: 'cpu_request',
		id: 'cpu_request',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'CPU Limit Usage (%)',
		value: 'cpu_limit',
		id: 'cpu_limit',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'CPU Usage (cores)',
		value: 'cpu',
		id: 'cpu',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Mem Req Usage (%)',
		value: 'memory_request',
		id: 'memory_request',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Mem Limit Usage (%)',
		value: 'memory_limit',
		id: 'memory_limit',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Mem Usage (WSS)',
		value: 'memory',
		id: 'memory',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
];

export const k8sJobsColumnsConfig: ColumnType<K8sRenderedRowData>[] = [
	{
		title: (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> JOB GROUP
			</div>
		),
		dataIndex: 'jobGroup',
		key: 'jobGroup',
		ellipsis: true,
		width: 150,
		align: 'left',
		sorter: false,
	},
	{
		title: <div>Job Name</div>,
		dataIndex: 'jobName',
		key: 'jobName',
		ellipsis: true,
		width: 80,
		sorter: false,
		align: 'left',
	},
	{
		title: <div>Namespace Name</div>,
		dataIndex: 'namespaceName',
		key: 'namespaceName',
		ellipsis: true,
		width: 80,
		sorter: false,
		align: 'left',
	},
	{
		title: <div>Successful</div>,
		dataIndex: 'successful_pods',
		key: 'successful_pods',
		ellipsis: true,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Failed</div>,
		dataIndex: 'failed_pods',
		key: 'failed_pods',
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Desired Successful</div>,
		dataIndex: 'desired_successful_pods',
		key: 'desired_successful_pods',
		ellipsis: true,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Active</div>,
		dataIndex: 'active_pods',
		key: 'active_pods',
		sorter: true,
		align: 'left',
	},
	{
		title: <div>CPU Req Usage (%)</div>,
		dataIndex: 'cpu_request',
		key: 'cpu_request',
		width: 180,
		ellipsis: true,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>CPU Limit Usage (%)</div>,
		dataIndex: 'cpu_limit',
		key: 'cpu_limit',
		width: 120,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>CPU Usage (cores)</div>,
		dataIndex: 'cpu',
		key: 'cpu',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Mem Req Usage (%)</div>,
		dataIndex: 'memory_request',
		key: 'memory_request',
		width: 120,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Mem Limit Usage (%)</div>,
		dataIndex: 'memory_limit',
		key: 'memory_limit',
		width: 120,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Mem Usage (WSS)</div>,
		dataIndex: 'memory',
		key: 'memory',
		width: 120,
		ellipsis: true,
		sorter: true,
		align: 'left',
	},
];

export const k8sJobsRenderRowData = (
	job: K8sJobsData,
	groupBy: BaseAutocompleteData[],
): K8sRenderedRowData => ({
	key: getRowKey(job, () => job.jobName || job.meta.k8s_job_name || '', groupBy),
	itemKey: job.meta.k8s_job_name,
	jobName: (
		<Tooltip title={job.meta.k8s_job_name}>{job.meta.k8s_job_name || ''}</Tooltip>
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
			<div className={styles.progressBar}>
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
			<div className={styles.progressBar}>
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
			<div className={styles.progressBar}>
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
			<div className={styles.progressBar}>
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
	jobGroup: getGroupByEl(job, groupBy),
	...job.meta,
	groupedByMeta: getGroupedByMeta(job, groupBy),
});
