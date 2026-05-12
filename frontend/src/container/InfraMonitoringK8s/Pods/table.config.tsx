import { Tooltip } from 'antd';
import { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { formatBytes } from '../commonUtils';
import { EntityProgressBar, ValidateColumnValueWrapper } from '../components';
import { InfraMonitoringEntity } from '../constants';
import { K8sPodsData } from './api';
import { Container } from '@signozhq/icons';

export function getK8sPodRowKey(pod: K8sPodsData): string {
	return pod.podUID || pod.meta.k8s_pod_uid || pod.meta.k8s_pod_name;
}

export function getK8sPodItemKey(pod: K8sPodsData): string {
	return pod.podUID;
}

export const k8sPodColumnsConfig: TableColumnDef<K8sPodsData>[] = [
	{
		id: 'podGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="POD GROUP" />,
		accessorFn: (row): string => row.meta.k8s_pod_name || '',
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
		id: 'podName',
		header: (): React.ReactNode => (
			<EntityGroupHeader
				title="Pod Name"
				icon={<Container data-hide-expanded="true" size={14} />}
			/>
		),
		accessorFn: (row): string => row.meta.k8s_pod_name || '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const podName = value as string;
			return (
				<Tooltip title={podName}>
					<TanStackTable.Text>{podName}</TanStackTable.Text>
				</Tooltip>
			);
		},
	},
	{
		id: 'cpu_request',
		header: 'CPU Req Usage (%)',
		accessorFn: (row): number => row.podCPURequest,
		width: { min: 210 },
		enableSort: true,
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
		header: 'CPU Limit Usage (%)',
		accessorFn: (row): number => row.podCPULimit,
		width: { min: 210 },
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
		header: 'CPU Usage (cores)',
		accessorFn: (row): number => row.podCPU,
		width: { min: 210 },
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
		accessorFn: (row): number => row.podMemoryRequest,
		width: { min: 210 },
		enableSort: true,
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
		header: 'Mem Limit Usage (%)',
		accessorFn: (row): number => row.podMemoryLimit,
		width: { min: 210 },
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
		header: 'Mem Usage (WSS)',
		accessorFn: (row): number => row.podMemory,
		width: { min: 210, default: '100%' },
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
	{
		id: 'namespace',
		header: 'Namespace',
		accessorFn: (row): string => row.meta.k8s_namespace_name || '',
		width: { default: 100 },
		enableSort: false,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
	{
		id: 'node',
		header: 'Node',
		accessorFn: (row): string => row.meta.k8s_node_name || '',
		width: { default: 100 },
		enableSort: false,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
	{
		id: 'cluster',
		header: 'Cluster',
		accessorFn: (row): string => row.meta.k8s_cluster_name || '',
		width: { default: 100 },
		enableSort: false,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
];
