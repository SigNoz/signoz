import { Color } from '@signozhq/design-tokens';
import { Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sVolumesData,
	K8sVolumesListPayload,
} from 'api/infraMonitoring/getK8sVolumesList';
import { Group } from 'lucide-react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { formatBytes, ValidateColumnValueWrapper } from '../commonUtils';
import { IEntityColumn } from '../utils';

export const defaultAddedColumns: IEntityColumn[] = [
	{
		label: 'PVC Name',
		value: 'pvcName',
		id: 'pvcName',
		canRemove: false,
	},
	{
		label: 'Namespace Name',
		value: 'namespaceName',
		id: 'namespaceName',
		canRemove: false,
	},
	{
		label: 'Volume Capacity',
		value: 'capacity',
		id: 'capacity',
		canRemove: false,
	},
	{
		label: 'Volume Utilization',
		value: 'usage',
		id: 'usage',
		canRemove: false,
	},
	{
		label: 'Volume Available',
		value: 'available',
		id: 'available',
		canRemove: false,
	},
];

export interface K8sVolumesRowData {
	key: string;
	volumeUID: string;
	pvcName: React.ReactNode;
	namespaceName: React.ReactNode;
	capacity: React.ReactNode;
	usage: React.ReactNode;
	available: React.ReactNode;
	groupedByMeta?: any;
}

const volumeGroupColumnConfig = {
	title: (
		<div className="column-header entity-group-header">
			<Group size={14} /> VOLUME GROUP
		</div>
	),
	dataIndex: 'volumeGroup',
	key: 'volumeGroup',
	ellipsis: true,
	width: 150,
	align: 'left',
	sorter: false,
	className: 'column entity-group-header',
};

export const getK8sVolumesListQuery = (): K8sVolumesListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

const columnsConfig = [
	{
		title: <div className="column-header-left pvc-name-header">PVC Name</div>,
		dataIndex: 'pvcName',
		key: 'pvcName',
		ellipsis: true,
		width: 120,
		sorter: false,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left namespace-name-header">
				Namespace Name
			</div>
		),
		dataIndex: 'namespaceName',
		key: 'namespaceName',
		ellipsis: true,
		width: 120,
		sorter: false,
		align: 'left',
	},
	{
		title: <div className="column-header-left small-col">Volume Capacity</div>,
		dataIndex: 'capacity',
		key: 'capacity',
		ellipsis: true,
		width: 120,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left small-col">Volume Utilization</div>,
		dataIndex: 'usage',
		key: 'usage',
		width: 100,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left small-col">Volume Available</div>,
		dataIndex: 'available',
		key: 'available',
		width: 80,
		sorter: true,
		align: 'left',
	},
];

export const getK8sVolumesListColumns = (
	groupBy: IBuilderQuery['groupBy'],
): ColumnType<K8sVolumesRowData>[] => {
	if (groupBy.length > 0) {
		const filteredColumns = [...columnsConfig].filter(
			(column) => column.key !== 'pvcName',
		);
		filteredColumns.unshift(volumeGroupColumnConfig);
		return filteredColumns as ColumnType<K8sVolumesRowData>[];
	}

	return columnsConfig as ColumnType<K8sVolumesRowData>[];
};

const getGroupByEle = (
	volume: K8sVolumesData,
	groupBy: IBuilderQuery['groupBy'],
): React.ReactNode => {
	const groupByValues: string[] = [];

	groupBy.forEach((group) => {
		groupByValues.push(volume.meta[group.key as keyof typeof volume.meta]);
	});

	return (
		<div className="pod-group">
			{groupByValues.map((value) => (
				<Tag key={value} color={Color.BG_SLATE_400} className="pod-group-tag-item">
					{value === '' ? '<no-value>' : value}
				</Tag>
			))}
		</div>
	);
};

export const formatDataForTable = (
	data: K8sVolumesData[],
	groupBy: IBuilderQuery['groupBy'],
): K8sVolumesRowData[] =>
	data.map((volume, index) => ({
		key: index.toString(),
		volumeUID: volume.persistentVolumeClaimName,
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
		volumeGroup: getGroupByEle(volume, groupBy),
		meta: volume.meta,
		...volume.meta,
		groupedByMeta: volume.meta,
	}));
