import { TableColumnType as ColumnType, Tooltip } from 'antd';
import { Group } from 'lucide-react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { K8sRenderedRowData } from '../Base/K8sBaseList';
import { IEntityColumn } from '../Base/useInfraMonitoringTableColumnsStore';
import { getGroupByEl, getGroupedByMeta, getRowKey } from '../Base/utils';
import { formatBytes, ValidateColumnValueWrapper } from '../commonUtils';
import { K8sVolumesData } from './api';

import styles from './table.module.scss';

export const k8sVolumesColumns: IEntityColumn[] = [
	{
		label: 'Volume Group',
		value: 'volumeGroup',
		id: 'volumeGroup',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'hidden-on-collapse',
	},
	{
		label: 'PVC Name',
		value: 'pvcName',
		id: 'pvcName',
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
		label: 'Volume Capacity',
		value: 'capacity',
		id: 'capacity',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Volume Utilization',
		value: 'usage',
		id: 'usage',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Volume Available',
		value: 'available',
		id: 'available',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
];

export const k8sVolumesColumnsConfig: ColumnType<K8sRenderedRowData>[] = [
	{
		title: (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> VOLUME GROUP
			</div>
		),
		dataIndex: 'volumeGroup',
		key: 'volumeGroup',
		ellipsis: true,
		width: 150,
		align: 'left',
		sorter: false,
	},
	{
		title: <div>PVC Name</div>,
		dataIndex: 'pvcName',
		key: 'pvcName',
		ellipsis: true,
		width: 120,
		sorter: false,
		align: 'left',
	},
	{
		title: <div>Namespace Name</div>,
		dataIndex: 'namespaceName',
		key: 'namespaceName',
		ellipsis: true,
		width: 120,
		sorter: false,
		align: 'left',
	},
	{
		title: <div>Volume Capacity</div>,
		dataIndex: 'capacity',
		key: 'capacity',
		ellipsis: true,
		width: 120,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Volume Utilization</div>,
		dataIndex: 'usage',
		key: 'usage',
		width: 100,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Volume Available</div>,
		dataIndex: 'available',
		key: 'available',
		width: 80,
		sorter: true,
		align: 'left',
	},
];

export const k8sVolumesRenderRowData = (
	volume: K8sVolumesData,
	groupBy: BaseAutocompleteData[],
): K8sRenderedRowData => ({
	key: getRowKey(
		volume,
		() =>
			volume.persistentVolumeClaimName ||
			volume.meta.k8s_persistentvolumeclaim_name ||
			'',
		groupBy,
	),
	itemKey: volume.persistentVolumeClaimName,
	pvcName: (
		<Tooltip title={volume.persistentVolumeClaimName}>
			{volume.persistentVolumeClaimName || ''}
		</Tooltip>
	),
	namespaceName: (
		<Tooltip title={volume.meta.k8s_namespace_name}>
			{volume.meta.k8s_namespace_name || ''}
		</Tooltip>
	),
	available: (
		<ValidateColumnValueWrapper value={volume.volumeAvailable}>
			{formatBytes(volume.volumeAvailable)}
		</ValidateColumnValueWrapper>
	),
	capacity: (
		<ValidateColumnValueWrapper value={volume.volumeCapacity}>
			{formatBytes(volume.volumeCapacity)}
		</ValidateColumnValueWrapper>
	),
	usage: (
		<ValidateColumnValueWrapper value={volume.volumeUsage}>
			{formatBytes(volume.volumeUsage)}
		</ValidateColumnValueWrapper>
	),
	volumeGroup: getGroupByEl(volume, groupBy),
	...volume.meta,
	groupedByMeta: getGroupedByMeta(volume, groupBy),
});
