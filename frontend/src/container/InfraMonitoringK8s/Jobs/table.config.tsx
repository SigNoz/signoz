import { TooltipSimple } from '@signozhq/ui/tooltip';
import { InframonitoringtypesJobRecordDTO } from 'api/generated/services/sigNoz.schemas';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { formatBytes, getPodPhaseStatusItems } from '../commonUtils';
import {
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
): string {
	return job.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME] || '';
}

export type JobTableColumnConfig =
	TableColumnDef<InframonitoringtypesJobRecordDTO>;
export const k8sJobsColumnsConfig: JobTableColumnConfig[] = [
	{
		id: 'jobGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="JOB GROUP" />,
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME] || '',
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
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME] || '',
		width: { min: 260 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const jobName = value as string;
			return (
				<TooltipSimple title={jobName}>
					<TanStackTable.Text>{jobName}</TanStackTable.Text>
				</TooltipSimple>
			);
		},
	},
	{
		id: 'namespaceName',
		header: 'Namespace Name',
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
		width: { default: 150 },
		enableSort: false,
		cell: ({ value }): React.ReactNode => {
			const namespaceName = value as string;
			return (
				<TooltipSimple title={namespaceName}>
					<TanStackTable.Text>{namespaceName}</TanStackTable.Text>
				</TooltipSimple>
			);
		},
	},
	{
		id: 'pod_counts_by_phase',
		header: 'Pod Phases',
		accessorFn: (row): InframonitoringtypesJobRecordDTO['podCountsByPhase'] =>
			row.podCountsByPhase,
		width: { min: 250 },
		enableSort: false,
		enableResize: true,
		cell: ({ row }): React.ReactNode => {
			const podCountsByPhase = row.podCountsByPhase;
			if (!podCountsByPhase) {
				return <TanStackTable.Text>-</TanStackTable.Text>;
			}
			return (
				<GroupedStatusCounts items={getPodPhaseStatusItems(podCountsByPhase)} />
			);
		},
	},
	{
		id: 'successful_pods',
		header: 'Successful Pods',
		accessorFn: (row): number => row.successfulPods,
		width: { min: 120 },
		enableSort: true,
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
		id: 'failed_pods',
		header: 'Failed Pods',
		accessorFn: (row): number => row.failedPods,
		width: { min: 100 },
		enableSort: true,
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
		id: 'desired_successful_pods',
		header: 'Desired Successful Pods',
		accessorFn: (row): number => row.desiredSuccessfulPods,
		width: { min: 160 },
		enableSort: true,
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
	{
		id: 'active_pods',
		header: 'Active Pods',
		accessorFn: (row): number => row.activePods,
		width: { min: 100 },
		enableSort: true,
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
		id: 'cpu_request',
		header: 'CPU Req Usage (%)',
		accessorFn: (row): number => row.jobCPURequest,
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
		accessorFn: (row): number => row.jobCPULimit,
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
		accessorFn: (row): number => row.jobCPU,
		width: { min: 190 },
		enableSort: true,
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
		header: 'Mem Req Usage (%)',
		accessorFn: (row): number => row.jobMemoryRequest,
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
		accessorFn: (row): number => row.jobMemoryLimit,
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
		accessorFn: (row): number => row.jobMemory,
		width: { min: 160 },
		enableSort: true,
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
];
