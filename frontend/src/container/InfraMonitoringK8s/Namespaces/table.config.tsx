import { FilePenLine } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { InframonitoringtypesNamespaceRecordDTO } from 'api/generated/services/sigNoz.schemas';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { formatBytes, getPodPhaseStatusItems } from '../commonUtils';
import { GroupedStatusCounts, ValidateColumnValueWrapper } from '../components';
import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from '../constants';

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
): string {
	return namespace.namespaceName;
}

export type NamespaceTableColumnConfig =
	TableColumnDef<InframonitoringtypesNamespaceRecordDTO>;
export const k8sNamespacesColumnsConfig: NamespaceTableColumnConfig[] = [
	{
		id: 'namespaceGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="NAMESPACE GROUP" />,
		accessorFn: (row): string => row.namespaceName || '',
		width: { min: 300 },
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
			return (
				<TooltipSimple title={namespaceName}>
					<TanStackTable.Text>{namespaceName}</TanStackTable.Text>
				</TooltipSimple>
			);
		},
	},
	{
		id: 'clusterName',
		header: 'Cluster Name',
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] || '',
		width: { default: 150 },
		enableSort: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
	{
		id: 'podCountsByPhase',
		header: 'Pod Phases',
		accessorFn: (
			row,
		): InframonitoringtypesNamespaceRecordDTO['podCountsByPhase'] =>
			row.podCountsByPhase,
		width: { min: 220 },
		enableSort: false,
		cell: ({ row }): React.ReactNode => {
			const podCountsByPhase = row.podCountsByPhase;
			if (!podCountsByPhase) {
				return <TanStackTable.Text>-</TanStackTable.Text>;
			}
			return (
				<GroupedStatusCounts items={getPodPhaseStatusItems(row.podCountsByPhase)} />
			);
		},
	},
	{
		id: 'cpu',
		header: 'CPU Usage (cores)',
		accessorFn: (row): number => row.namespaceCPU,
		width: { min: 220 },
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
		header: 'Mem Usage (WSS)',
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
