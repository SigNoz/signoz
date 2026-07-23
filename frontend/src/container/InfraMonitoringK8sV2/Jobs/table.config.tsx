import { Color } from '@signozhq/design-tokens';
import { InframonitoringtypesJobRecordDTO } from 'api/generated/services/sigNoz.schemas';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8sV2/components';

import ColumnHeader from '../Base/ColumnHeader';
import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { SelectedItemParams } from '../hooks';
import { formatBytes, getPodStatusItems } from '../commonUtils';
import {
	CellValueTooltip,
	EntityProgressBar,
	GroupedStatusCounts,
	ValidateColumnValueWrapper,
} from '../components';
import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from '../constants';
import { Bolt } from '@signozhq/icons';

export function getK8sJobRowKey(job: InframonitoringtypesJobRecordDTO): string {
	return (
		job.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME] || job.jobName || ''
	);
}

export function getK8sJobItemKey(
	job: InframonitoringtypesJobRecordDTO,
): SelectedItemParams {
	return {
		selectedItem: job.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME] ?? null,
		clusterName: job.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? null,
		namespaceName:
			job.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ?? null,
	};
}

export type JobTableColumnConfig =
	TableColumnDef<InframonitoringtypesJobRecordDTO>;
export const k8sJobsColumnsConfig: JobTableColumnConfig[] = [
	{
		id: 'jobGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="Job Group" />,
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME] || '',
		width: { min: 290 },
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
				docPath="/infrastructure-monitoring/kubernetes/jobs#job-name"
			/>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME] || '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const jobName = value as string;
			return <CellValueTooltip value={jobName} />;
		},
	},
	{
		id: 'namespaceName',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/jobs#namespace-name">
				Namespace
			</ColumnHeader>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
		width: { min: 160 },
		enableSort: false,
		enableResize: true,
		cell: ({ value }): React.ReactNode => {
			const namespaceName = value as string;
			return <CellValueTooltip value={namespaceName} />;
		},
	},
	{
		id: 'pod_counts_by_status',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/jobs#pod-counts-by-status">
				Pod Status
			</ColumnHeader>
		),
		accessorFn: (row): InframonitoringtypesJobRecordDTO['podCountsByStatus'] =>
			row.podCountsByStatus,
		width: { min: 250 },
		enableSort: false,
		enableResize: true,
		cell: ({ row, rowId }): React.ReactNode => {
			const podCountsByStatus = row.podCountsByStatus;
			if (!podCountsByStatus) {
				return <TanStackTable.Text>-</TanStackTable.Text>;
			}
			return (
				<GroupedStatusCounts
					items={getPodStatusItems(podCountsByStatus)}
					rowId={rowId}
				/>
			);
		},
	},
	{
		id: 'completion',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/jobs#completion">
				Completions
			</ColumnHeader>
		),
		accessorFn: (row): number => row.successfulPods,
		width: { min: 210 },
		enableSort: false,
		enableResize: true,
		cell: ({ row, rowId }): React.ReactNode => (
			<GroupedStatusCounts
				items={[
					{ value: row.activePods, label: 'Active', color: Color.BG_ROBIN_500 },
					{ value: row.failedPods, label: 'Failed', color: Color.BG_CHERRY_500 },
					{
						value: row.successfulPods,
						label: 'Successful',
						color: Color.BG_FOREST_500,
					},
					{
						value: row.desiredSuccessfulPods,
						label: 'Desired',
						color: Color.BG_AMBER_500,
					},
				]}
				rowId={rowId}
			/>
		),
	},
	{
		id: 'cpu_request',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/jobs#cpu-req-usage-">
				CPU Request
				<br /> Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.jobCPURequest,
		width: { min: 200, default: 200 },
		enableSort: true,
		enableResize: true,
		defaultVisibility: false,
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
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/jobs#cpu-limit-usage-">
				CPU Limit
				<br /> Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.jobCPULimit,
		width: { min: 200, default: 200 },
		enableSort: true,
		enableResize: true,
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
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/jobs#cpu-usage-cores">
				CPU Usage
				<br /> (cores)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.jobCPU,
		width: { min: 160 },
		enableSort: true,
		enableResize: true,
		cell: ({ value }): React.ReactNode => {
			const cpu = Number(value);
			return (
				<ValidateColumnValueWrapper
					value={cpu}
					entity={InfraMonitoringEntity.JOBS}
					attribute="CPU metric"
				>
					<TanStackTable.Text>{cpu.toFixed(2)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory_request',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/jobs#mem-req-usage-">
				Memory Request
				<br /> Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.jobMemoryRequest,
		width: { min: 190 },
		enableSort: true,
		enableResize: true,
		defaultVisibility: false,
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
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/jobs#mem-limit-usage-">
				Memory Limit
				<br /> Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.jobMemoryLimit,
		width: { min: 180 },
		enableSort: true,
		enableResize: true,
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
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/jobs#mem-usage-wss">
				Memory Usage
				<br /> (WSS)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.jobMemory,
		width: { min: 160 },
		enableSort: true,
		enableResize: true,
		cell: ({ value }): React.ReactNode => {
			const memory = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memory}
					entity={InfraMonitoringEntity.JOBS}
					attribute="memory metric"
				>
					<TanStackTable.Text>{formatBytes(memory)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'active_pods',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/jobs#active">
				Active Pods
			</ColumnHeader>
		),
		accessorFn: (row): number => row.activePods,
		width: { min: 100 },
		enableSort: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const activePods = value as number;
			return (
				<ValidateColumnValueWrapper
					value={activePods}
					entity={InfraMonitoringEntity.JOBS}
					attribute="active pod"
				>
					<TanStackTable.Text>{activePods}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'failed_pods',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/jobs#failed">
				Failed Pods
			</ColumnHeader>
		),
		accessorFn: (row): number => row.failedPods,
		width: { min: 100 },
		enableSort: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const failedPods = value as number;
			return (
				<ValidateColumnValueWrapper
					value={failedPods}
					entity={InfraMonitoringEntity.JOBS}
					attribute="failed pod"
				>
					<TanStackTable.Text>{failedPods}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'successful_pods',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/jobs#successful">
				Successful Pods
			</ColumnHeader>
		),
		accessorFn: (row): number => row.successfulPods,
		width: { min: 120 },
		enableSort: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const successfulPods = value as number;
			return (
				<ValidateColumnValueWrapper
					value={successfulPods}
					entity={InfraMonitoringEntity.JOBS}
					attribute="successful pod"
				>
					<TanStackTable.Text>{successfulPods}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'desired_successful_pods',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/jobs#desired-successful">
				Desired Successful Pods
			</ColumnHeader>
		),
		accessorFn: (row): number => row.desiredSuccessfulPods,
		width: { min: 160 },
		enableSort: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const desiredSuccessfulPods = value as number;
			return (
				<ValidateColumnValueWrapper
					value={desiredSuccessfulPods}
					entity={InfraMonitoringEntity.JOBS}
					attribute="desired successful pod"
				>
					<TanStackTable.Text>{desiredSuccessfulPods}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
];
