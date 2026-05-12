import { Tooltip } from 'antd';
import { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { formatBytes } from '../commonUtils';
import { EntityProgressBar, ValidateColumnValueWrapper } from '../components';
import { InfraMonitoringEntity } from '../constants';
import { K8sJobsData } from './api';
import { Bolt } from '@signozhq/icons';

export function getK8sJobRowKey(job: K8sJobsData): string {
	return job.jobName || job.meta.k8s_job_name || '';
}

export function getK8sJobItemKey(job: K8sJobsData): string {
	return job.meta.k8s_job_name;
}

export const k8sJobsColumnsConfig: TableColumnDef<K8sJobsData>[] = [
	{
		id: 'jobGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="JOB GROUP" />,
		accessorFn: (row): string => row.meta.k8s_job_name || '',
		width: { min: 270 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-collapse',
		cell: ({ isExpanded, toggleExpanded, row }): JSX.Element | null => {
			return (
				<ExpandButtonWrapper
					isExpanded={isExpanded}
					toggleExpanded={toggleExpanded}
				>
					<K8sGroupCell row={row} />
				</ExpandButtonWrapper>
			);
		},
	},
	{
		id: 'jobName',
		header: (): React.ReactNode => (
			<EntityGroupHeader
				title="Job Name"
				icon={<Bolt data-hide-expanded="true" size={14} />}
			/>
		),
		accessorFn: (row): string => row.meta.k8s_job_name || '',
		width: { min: 260 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const jobName = value as string;
			return (
				<Tooltip title={jobName}>
					<TanStackTable.Text>{jobName}</TanStackTable.Text>
				</Tooltip>
			);
		},
	},
	{
		id: 'namespaceName',
		header: 'Namespace Name',
		accessorFn: (row): string => row.meta.k8s_namespace_name || '',
		width: { default: 150 },
		enableSort: false,
		cell: ({ value }): React.ReactNode => {
			const namespaceName = value as string;
			return (
				<Tooltip title={namespaceName}>
					<TanStackTable.Text>{namespaceName}</TanStackTable.Text>
				</Tooltip>
			);
		},
	},
	{
		id: 'successful_pods',
		header: 'Successful',
		accessorFn: (row): number => row.successfulPods,
		width: { min: 120 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const successfulPods = value as number;
			return (
				<ValidateColumnValueWrapper value={successfulPods}>
					<TanStackTable.Text>{successfulPods}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'failed_pods',
		header: 'Failed',
		accessorFn: (row): number => row.failedPods,
		width: { min: 100 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const failedPods = value as number;
			return (
				<ValidateColumnValueWrapper value={failedPods}>
					<TanStackTable.Text>{failedPods}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'desired_successful_pods',
		header: 'Desired Successful',
		accessorFn: (row): number => row.desiredSuccessfulPods,
		width: { min: 160 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const desiredSuccessfulPods = value as number;
			return (
				<ValidateColumnValueWrapper value={desiredSuccessfulPods}>
					<TanStackTable.Text>{desiredSuccessfulPods}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'active_pods',
		header: 'Active',
		accessorFn: (row): number => row.activePods,
		width: { min: 100 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const activePods = value as number;
			return (
				<ValidateColumnValueWrapper value={activePods}>
					<TanStackTable.Text>{activePods}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'cpu_request',
		header: 'CPU Req Usage (%)',
		accessorFn: (row): number => row.cpuRequest,
		width: { min: 200, default: 200 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpuRequest = value as number;
			return (
				<ValidateColumnValueWrapper
					value={cpuRequest}
					entity={InfraMonitoringEntity.JOBS}
					attribute="CPU Request"
				>
					<EntityProgressBar value={cpuRequest} type="request" />
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'cpu_limit',
		header: 'CPU Limit Usage (%)',
		accessorFn: (row): number => row.cpuLimit,
		width: { min: 200, default: 200 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpuLimit = value as number;
			return (
				<ValidateColumnValueWrapper
					value={cpuLimit}
					entity={InfraMonitoringEntity.JOBS}
					attribute="CPU Limit"
				>
					<EntityProgressBar value={cpuLimit} type="limit" />
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'cpu',
		header: 'CPU Usage (cores)',
		accessorFn: (row): number => row.cpuUsage,
		width: { min: 190 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpu = value as number;
			return (
				<ValidateColumnValueWrapper value={cpu}>
					<TanStackTable.Text>{cpu}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory_request',
		header: 'Mem Req Usage (%)',
		accessorFn: (row): number => row.memoryRequest,
		width: { min: 190 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memoryRequest = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memoryRequest}
					entity={InfraMonitoringEntity.JOBS}
					attribute="Memory Request"
				>
					<EntityProgressBar value={memoryRequest} type="request" />
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory_limit',
		header: 'Mem Limit Usage (%)',
		accessorFn: (row): number => row.memoryLimit,
		width: { min: 180 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memoryLimit = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memoryLimit}
					entity={InfraMonitoringEntity.JOBS}
					attribute="Memory Limit"
				>
					<EntityProgressBar value={memoryLimit} type="limit" />
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory',
		header: 'Mem Usage (WSS)',
		accessorFn: (row): number => row.memoryUsage,
		width: { min: 160 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memory = value as number;
			return (
				<ValidateColumnValueWrapper value={memory}>
					<TanStackTable.Text>{formatBytes(memory)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
];
