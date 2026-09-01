import { Container } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import {
	InframonitoringtypesContainerReadyDTO,
	InframonitoringtypesContainerRecordDTO,
	InframonitoringtypesContainerStatusDTO,
} from 'api/generated/services/sigNoz.schemas';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8sV2/components';

import ColumnHeader from '../Base/ColumnHeader';
import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { formatBytes } from '../commonUtils';
import {
	EntityProgressBar,
	EntityProgressThresholds,
	GroupedStatusCounts,
	TextNoData,
	ValidateColumnValueWrapper,
} from '../components';
import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from '../constants';
import { SelectedItemParams } from '../hooks';
import {
	CONTAINER_READY_COLORS,
	CONTAINER_READY_LABELS,
	CONTAINER_STATUS_COLORS,
	CONTAINER_STATUS_LABELS,
	CONTAINERS_DOC_PATH,
	getContainerImageWithTag,
	getContainerReadyItems,
	getContainerStatusItems,
} from './utils';

export function getK8sContainerRowKey(
	container: InframonitoringtypesContainerRecordDTO,
): string {
	return (
		[container.podUID, container.containerName].filter(Boolean).join('/') ||
		container.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_NAME] ||
		''
	);
}

export function getK8sContainerItemKey(
	container: InframonitoringtypesContainerRecordDTO,
): SelectedItemParams {
	return {
		selectedItem:
			container.podUID ||
			container.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID] ||
			null,
		containerName:
			container.containerName ||
			container.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_NAME] ||
			null,
		clusterName: null,
		namespaceName: null,
	};
}

export type ContainerTableColumnConfig =
	TableColumnDef<InframonitoringtypesContainerRecordDTO>;

/**
 * The grouped table and its nested rows are separate tables, so a column and the
 * one that replaces it while grouped share a width to keep the two aligned.
 */
const NAME_COLUMN_WIDTH = 220;
const STATUS_COLUMN_WIDTH = 250;

export const k8sContainerColumnsConfig: ContainerTableColumnConfig[] = [
	{
		id: 'containerGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="Container Group" />,
		accessorFn: (row): string => row.containerName || '',
		width: { min: NAME_COLUMN_WIDTH },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-collapse',
		cell: ({ isExpanded, toggleExpanded, row }): JSX.Element | null => (
			<ExpandButtonWrapper isExpanded={isExpanded} toggleExpanded={toggleExpanded}>
				<K8sGroupCell row={row} />
			</ExpandButtonWrapper>
		),
	},
	{
		id: INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_NAME,
		header: (): React.ReactNode => (
			<EntityGroupHeader
				title="Container Name"
				icon={<Container data-hide-expanded="true" size={14} />}
				docPath={`${CONTAINERS_DOC_PATH}#container-name`}
			/>
		),
		accessorFn: (row): string =>
			row.containerName ||
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_NAME] ||
			'',
		width: { min: NAME_COLUMN_WIDTH },
		enableSort: true,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
	{
		id: 'podName',
		header: (): React.ReactNode => (
			<ColumnHeader docPath={`${CONTAINERS_DOC_PATH}#pod-name`}>
				Pod Name
			</ColumnHeader>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME] || '',
		width: { min: 260 },
		enableSort: false,
		cell: ({ value }): React.ReactNode => {
			const podName = value as string;
			if (!podName) {
				return <TextNoData type="tanstack" />;
			}
			return <TanStackTable.Text>{podName}</TanStackTable.Text>;
		},
	},
	{
		id: 'namespace',
		header: (): React.ReactNode => (
			<ColumnHeader docPath={CONTAINERS_DOC_PATH}>Namespace</ColumnHeader>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
		width: { min: 160 },
		enableSort: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
	{
		id: 'image',
		header: (): React.ReactNode => (
			<ColumnHeader docPath={`${CONTAINERS_DOC_PATH}#imagetag`}>
				Image:Tag
			</ColumnHeader>
		),
		accessorFn: (row): string => getContainerImageWithTag(row),
		width: { min: 240 },
		enableSort: false,
		cell: ({ value }): React.ReactNode => {
			const image = value as string;
			if (!image) {
				return <TextNoData type="tanstack" />;
			}
			return <TanStackTable.Text>{image}</TanStackTable.Text>;
		},
	},
	{
		id: 'containerStatus',
		header: (): React.ReactNode => (
			<ColumnHeader docPath={`${CONTAINERS_DOC_PATH}#status`}>Status</ColumnHeader>
		),
		accessorFn: (row): string => row.status,
		width: { min: STATUS_COLUMN_WIDTH },
		enableSort: false,
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ row }): React.ReactNode => {
			if (
				!row.status ||
				row.status === InframonitoringtypesContainerStatusDTO.no_data
			) {
				return <TextNoData type="tanstack" />;
			}

			return (
				<Badge color={CONTAINER_STATUS_COLORS[row.status]} variant="outline">
					{CONTAINER_STATUS_LABELS[row.status]}
				</Badge>
			);
		},
	},
	{
		id: 'containerCountsByStatus',
		header: (): React.ReactNode => (
			<ColumnHeader docPath={`${CONTAINERS_DOC_PATH}#status`}>Status</ColumnHeader>
		),
		accessorFn: (
			row,
		): InframonitoringtypesContainerRecordDTO['containerCountsByStatus'] =>
			row.containerCountsByStatus,
		width: { min: STATUS_COLUMN_WIDTH },
		enableSort: false,
		visibilityBehavior: 'hidden-on-collapse',
		cell: ({ row, rowId }): React.ReactNode => {
			if (!row.containerCountsByStatus) {
				return <TextNoData type="tanstack" />;
			}
			return (
				<GroupedStatusCounts
					items={getContainerStatusItems(row.containerCountsByStatus)}
					rowId={rowId}
				/>
			);
		},
	},
	{
		id: 'containerReady',
		header: (): React.ReactNode => (
			<ColumnHeader docPath={`${CONTAINERS_DOC_PATH}#ready`}>Ready</ColumnHeader>
		),
		accessorFn: (row): string => row.ready,
		width: { min: 130 },
		enableSort: false,
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ row }): React.ReactNode => {
			if (
				!row.ready ||
				row.ready === InframonitoringtypesContainerReadyDTO.no_data
			) {
				return <TextNoData type="tanstack" />;
			}

			return (
				<Badge color={CONTAINER_READY_COLORS[row.ready]} variant="outline">
					{CONTAINER_READY_LABELS[row.ready]}
				</Badge>
			);
		},
	},
	{
		id: 'containerCountsByReady',
		header: (): React.ReactNode => (
			<ColumnHeader docPath={`${CONTAINERS_DOC_PATH}#ready`}>Ready</ColumnHeader>
		),
		accessorFn: (
			row,
		): InframonitoringtypesContainerRecordDTO['containerCountsByReady'] =>
			row.containerCountsByReady,
		width: { min: 130 },
		enableSort: false,
		visibilityBehavior: 'hidden-on-collapse',
		cell: ({ row, rowId }): React.ReactNode => {
			if (!row.containerCountsByReady) {
				return <TextNoData type="tanstack" />;
			}
			return (
				<GroupedStatusCounts
					items={getContainerReadyItems(row.containerCountsByReady)}
					rowId={rowId}
				/>
			);
		},
	},
	{
		id: 'containerRestarts',
		header: (): React.ReactNode => (
			<ColumnHeader docPath={`${CONTAINERS_DOC_PATH}#restarts`}>
				Restarts
			</ColumnHeader>
		),
		accessorFn: (row): number => row.restarts,
		width: { min: 130 },
		enableSort: false,
		cell: ({ value, rowId }): React.ReactNode => (
			<ValidateColumnValueWrapper
				rowId={rowId}
				value={value as number}
				entity={InfraMonitoringEntity.CONTAINERS}
				attribute="Restarts"
			>
				<TanStackTable.Text>{value as number}</TanStackTable.Text>
			</ValidateColumnValueWrapper>
		),
	},
	{
		id: 'cpu_request',
		header: (): React.ReactNode => (
			<ColumnHeader
				docPath={`${CONTAINERS_DOC_PATH}#cpu-req-usage-`}
				tooltip={<EntityProgressThresholds type="cpu-request" />}
			>
				CPU Request Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.cpuRequestUtilization,
		width: { min: 210 },
		enableSort: true,
		cell: ({ value, rowId }): React.ReactNode => (
			<ValidateColumnValueWrapper
				rowId={rowId}
				value={value as number}
				entity={InfraMonitoringEntity.CONTAINERS}
				attribute="CPU Request"
			>
				<EntityProgressBar value={value as number} type="cpu-request" />
			</ValidateColumnValueWrapper>
		),
	},
	{
		id: 'cpu_limit',
		header: (): React.ReactNode => (
			<ColumnHeader
				docPath={`${CONTAINERS_DOC_PATH}#cpu-limit-usage-`}
				tooltip={<EntityProgressThresholds type="cpu-limit" />}
			>
				CPU Limit Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.cpuLimitUtilization,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value, rowId }): React.ReactNode => (
			<ValidateColumnValueWrapper
				rowId={rowId}
				value={value as number}
				entity={InfraMonitoringEntity.CONTAINERS}
				attribute="CPU Limit"
			>
				<EntityProgressBar value={value as number} type="cpu-limit" />
			</ValidateColumnValueWrapper>
		),
	},
	{
		id: 'cpu',
		header: (): React.ReactNode => (
			<ColumnHeader docPath={`${CONTAINERS_DOC_PATH}#cpu-usage-cores`}>
				CPU Usage (cores)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.cpu,
		width: { min: 160 },
		enableSort: true,
		cell: ({ value, rowId }): React.ReactNode => (
			<ValidateColumnValueWrapper
				rowId={rowId}
				value={Number(value)}
				entity={InfraMonitoringEntity.CONTAINERS}
				attribute="CPU metric"
			>
				<TanStackTable.Text>{Number(value).toFixed(2)}</TanStackTable.Text>
			</ValidateColumnValueWrapper>
		),
	},
	{
		id: 'memory_request',
		header: (): React.ReactNode => (
			<ColumnHeader
				docPath={`${CONTAINERS_DOC_PATH}#mem-req-usage-`}
				tooltip={<EntityProgressThresholds type="memory-request" />}
			>
				Memory Request Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.memoryRequestUtilization,
		width: { min: 210 },
		enableSort: true,
		cell: ({ value, rowId }): React.ReactNode => (
			<ValidateColumnValueWrapper
				rowId={rowId}
				value={value as number}
				entity={InfraMonitoringEntity.CONTAINERS}
				attribute="Memory Request"
			>
				<EntityProgressBar value={value as number} type="memory-request" />
			</ValidateColumnValueWrapper>
		),
	},
	{
		id: 'memory_limit',
		header: (): React.ReactNode => (
			<ColumnHeader
				docPath={`${CONTAINERS_DOC_PATH}#mem-limit-usage-`}
				tooltip={<EntityProgressThresholds type="memory-limit" />}
			>
				Memory Limit Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.memoryLimitUtilization,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value, rowId }): React.ReactNode => (
			<ValidateColumnValueWrapper
				rowId={rowId}
				value={value as number}
				entity={InfraMonitoringEntity.CONTAINERS}
				attribute="Memory Limit"
			>
				<EntityProgressBar value={value as number} type="memory-limit" />
			</ValidateColumnValueWrapper>
		),
	},
	{
		id: 'memory',
		header: (): React.ReactNode => (
			<ColumnHeader docPath={`${CONTAINERS_DOC_PATH}#mem-usage-wss`}>
				Memory Usage (WSS)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.memory,
		width: { min: 210, default: '100%' },
		enableSort: true,
		cell: ({ value, rowId }): React.ReactNode => (
			<ValidateColumnValueWrapper
				rowId={rowId}
				value={value as number}
				entity={InfraMonitoringEntity.CONTAINERS}
				attribute="memory metric"
			>
				<TanStackTable.Text>{formatBytes(value as number)}</TanStackTable.Text>
			</ValidateColumnValueWrapper>
		),
	},
	{
		id: 'node',
		header: (): React.ReactNode => (
			<ColumnHeader docPath={CONTAINERS_DOC_PATH}>Node</ColumnHeader>
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
			<ColumnHeader docPath={CONTAINERS_DOC_PATH}>Cluster</ColumnHeader>
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
	{
		id: 'deployment',
		header: (): React.ReactNode => (
			<ColumnHeader docPath={CONTAINERS_DOC_PATH}>Deployment</ColumnHeader>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] || '',
		width: { default: 100 },
		enableSort: false,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
];
