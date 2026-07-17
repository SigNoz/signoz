import { Container } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import {
	InframonitoringtypesPodRecordDTO,
	InframonitoringtypesPodStatusDTO,
} from 'api/generated/services/sigNoz.schemas';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8sV2/components';

import ColumnHeader from '../Base/ColumnHeader';
import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import {
	formatBytes,
	getPodStatusItems,
	POD_STATUS_COLORS,
} from '../commonUtils';
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
import { Typography } from '@signozhq/ui/typography';
import { formatAge } from 'utils/timeUtils';

export function getK8sPodRowKey(pod: InframonitoringtypesPodRecordDTO): string {
	return (
		pod.podUID ||
		pod.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID] ||
		pod.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME] ||
		''
	);
}

export function getK8sPodItemKey(
	pod: InframonitoringtypesPodRecordDTO,
): string {
	return pod.podUID;
}

export type PodTableColumnConfig =
	TableColumnDef<InframonitoringtypesPodRecordDTO>;
export const k8sPodColumnsConfig: PodTableColumnConfig[] = [
	{
		id: 'podGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="Pod Group" />,
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME] || '',
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
		id: 'podName',
		header: (): React.ReactNode => (
			<EntityGroupHeader
				title="Pod Name"
				icon={<Container data-hide-expanded="true" size={14} />}
				docPath="/infrastructure-monitoring/kubernetes/pods#pod-name"
			/>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME] || '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const podName = value as string;
			return <CellValueTooltip value={podName} />;
		},
	},
	{
		id: 'podStatus',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/pods#pod-status">
				Status
			</ColumnHeader>
		),
		accessorFn: (row): string => row.podStatus,
		width: { min: 160 },
		enableSort: false,
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ row }): React.ReactNode => {
			if (!row.podStatus) {
				return <></>;
			}

			const color = POD_STATUS_COLORS[row.podStatus] || POD_STATUS_COLORS.unknown;
			const label =
				row.podStatus === InframonitoringtypesPodStatusDTO.no_data
					? 'No Data'
					: row.podStatus.charAt(0).toUpperCase() + row.podStatus.slice(1);
			return (
				<Badge color={color} variant="outline">
					{label}
				</Badge>
			);
		},
	},
	{
		id: 'podCountsByStatus',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/pods#pod-status">
				Status
			</ColumnHeader>
		),
		accessorFn: (row): InframonitoringtypesPodRecordDTO['podCountsByStatus'] =>
			row.podCountsByStatus,
		width: { min: 250 },
		enableSort: false,
		visibilityBehavior: 'hidden-on-collapse',
		cell: ({ row, rowId }): React.ReactNode => {
			const podCountsByStatus = row.podCountsByStatus;
			if (!podCountsByStatus) {
				return <TanStackTable.Text>-</TanStackTable.Text>;
			}
			return (
				<GroupedStatusCounts
					items={getPodStatusItems(row.podCountsByStatus)}
					rowId={rowId}
				/>
			);
		},
	},
	{
		id: 'podAge',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/pods#age">
				Age
			</ColumnHeader>
		),
		accessorFn: (row): number => row.podAge,
		width: { min: 100 },
		enableSort: false,
		cell: ({ value }): React.ReactNode => {
			const age = value as number;
			if (age === -1) {
				return (
					<TooltipSimple title="No data">
						<Typography.Text>-</Typography.Text>
					</TooltipSimple>
				);
			}
			return <TanStackTable.Text>{formatAge(age)}</TanStackTable.Text>;
		},
	},
	{
		id: 'podRestarts',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/pods#restarts">
				Restarts
			</ColumnHeader>
		),
		accessorFn: (row): number => row.podRestarts,
		width: { min: 140 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const restarts = value as number;
			if (restarts === -1) {
				return (
					<TooltipSimple title="No data">
						<Typography.Text>-</Typography.Text>
					</TooltipSimple>
				);
			}
			return <TanStackTable.Text>{restarts}</TanStackTable.Text>;
		},
	},
	{
		id: 'cpu_request',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/pods#cpu-req-usage-">
				CPU Request
				<br /> Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.podCPURequest,
		width: { min: 210 },
		enableSort: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const cpuRequest = value as number;
			return (
				<ValidateColumnValueWrapper
					value={cpuRequest}
					entity={InfraMonitoringEntity.PODS}
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
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/pods#cpu-limit-usage-">
				CPU Limit
				<br /> Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.podCPULimit,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpuLimit = value as number;
			return (
				<ValidateColumnValueWrapper
					value={cpuLimit}
					entity={InfraMonitoringEntity.PODS}
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
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/pods#cpu-usage-cores">
				CPU Usage
				<br /> (cores)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.podCPU,
		width: { min: 160 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpu = Number(value);
			return (
				<ValidateColumnValueWrapper
					value={cpu}
					entity={InfraMonitoringEntity.PODS}
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
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/pods#mem-req-usage-">
				Memory Request
				<br /> Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.podMemoryRequest,
		width: { min: 210 },
		enableSort: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const memoryRequest = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memoryRequest}
					entity={InfraMonitoringEntity.PODS}
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
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/pods#mem-limit-usage-">
				Memory Limit
				<br /> Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.podMemoryLimit,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memoryLimit = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memoryLimit}
					entity={InfraMonitoringEntity.PODS}
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
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/pods#mem-usage-wss">
				Memory Usage
				<br /> (WSS)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.podMemory,
		width: { min: 210, default: '100%' },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memory = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memory}
					entity={InfraMonitoringEntity.PODS}
					attribute="memory metric"
				>
					<TanStackTable.Text>{formatBytes(memory)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'namespace',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/pods#additional-columns">
				Namespace
			</ColumnHeader>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
		width: { default: 100 },
		enableSort: false,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
	{
		id: 'node',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/pods#additional-columns">
				Node
			</ColumnHeader>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME] || '',
		width: { default: 100 },
		enableSort: false,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
	{
		id: 'cluster',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/pods#additional-columns">
				Cluster
			</ColumnHeader>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] || '',
		width: { default: 100 },
		enableSort: false,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
];
