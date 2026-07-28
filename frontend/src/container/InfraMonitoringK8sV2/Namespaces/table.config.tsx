import { FilePenLine } from '@signozhq/icons';
import { InframonitoringtypesNamespaceRecordDTO } from 'api/generated/services/sigNoz.schemas';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8sV2/components';

import ColumnHeader from '../Base/ColumnHeader';
import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { formatBytes, getPodStatusItems } from '../commonUtils';
import {
	CellValueTooltip,
	GroupedStatusCounts,
	ValidateColumnValueWrapper,
} from '../components';
import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from '../constants';
import { SelectedItemParams } from '../hooks';

export function getK8sNamespaceRowKey(
	namespace: InframonitoringtypesNamespaceRecordDTO,
): string {
	return (
		namespace.namespaceName ||
		namespace.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ||
		''
	);
}

export function getK8sNamespaceItemKey(
	namespace: InframonitoringtypesNamespaceRecordDTO,
): SelectedItemParams {
	return {
		selectedItem:
			namespace.namespaceName ??
			namespace.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ??
			null,
		clusterName:
			namespace.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? null,
	};
}

export type NamespaceTableColumnConfig =
	TableColumnDef<InframonitoringtypesNamespaceRecordDTO>;
export const k8sNamespacesColumnsConfig: NamespaceTableColumnConfig[] = [
	{
		id: 'namespaceGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="Namespace Group" />,
		accessorFn: (row): string => row.namespaceName || '',
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
		id: 'namespaceName',
		header: (): React.ReactNode => (
			<EntityGroupHeader
				title="Namespace Name"
				icon={<FilePenLine data-hide-expanded="true" size={14} />}
				docPath="/infrastructure-monitoring/kubernetes/namespaces#namespace-name"
			/>
		),
		accessorFn: (row): string => row.namespaceName || '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const namespaceName = value as string;
			return <CellValueTooltip value={namespaceName} />;
		},
	},
	{
		id: 'clusterName',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/namespaces#cluster-name">
				Cluster Name
			</ColumnHeader>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] || '',
		width: { default: 150 },
		enableSort: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
	{
		id: 'podCountsByStatus',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/namespaces#pod-counts-by-status">
				Pod Status
			</ColumnHeader>
		),
		accessorFn: (
			row,
		): InframonitoringtypesNamespaceRecordDTO['podCountsByStatus'] =>
			row.podCountsByStatus,
		width: { min: 250 },
		enableSort: false,
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
		id: 'cpu',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/namespaces#cpu-usage-cores">
				CPU Usage (cores)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.namespaceCPU,
		width: { min: 190 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpu = Number(value);
			return (
				<ValidateColumnValueWrapper
					value={cpu}
					entity={InfraMonitoringEntity.NAMESPACES}
					attribute="CPU metric"
				>
					<TanStackTable.Text>{cpu.toFixed(2)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/namespaces#mem-usage-wss">
				Memory Usage (WSS)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.namespaceMemory,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memory = Number(value);
			return (
				<ValidateColumnValueWrapper
					value={memory}
					entity={InfraMonitoringEntity.NAMESPACES}
					attribute="memory metric"
				>
					<TanStackTable.Text>{formatBytes(memory)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
];
