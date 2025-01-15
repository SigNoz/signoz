import { Color } from '@signozhq/design-tokens';
import { Tag } from 'antd';
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
		label: 'Volume Name',
		value: 'volumeName',
		id: 'volumeName',
		canRemove: false,
	},
	{
		label: 'Cluster Name',
		value: 'clusterName',
		id: 'clusterName',
		canRemove: false,
	},
	{
		label: 'CPU Utilization (cores)',
		value: 'cpu',
		id: 'cpu',
		canRemove: false,
	},
	{
		label: 'Memory Utilization (bytes)',
		value: 'memory',
		id: 'memory',
		canRemove: false,
	},
];

export interface K8sVolumesRowData {
	key: string;
	volumeUID: string;
	volumeName: string;
	clusterName: string;
	cpu: React.ReactNode;
	memory: React.ReactNode;
	groupedByMeta?: any;
}

const volumeGroupColumnConfig = {
	title: (
		<div className="column-header pod-group-header">
			<Group size={14} /> NAMESPACE GROUP
		</div>
	),
	dataIndex: 'volumeGroup',
	key: 'volumeGroup',
	ellipsis: true,
	width: 150,
	align: 'left',
	sorter: false,
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
		title: <div className="column-header-left">Volume Name</div>,
		dataIndex: 'volumeName',
		key: 'volumeName',
		ellipsis: true,
		width: 120,
		sorter: false,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Cluster Name</div>,
		dataIndex: 'clusterName',
		key: 'clusterName',
		ellipsis: true,
		width: 120,
		sorter: false,
		align: 'left',
	},
	{
		title: <div className="column-header-left">CPU Usage (cores)</div>,
		dataIndex: 'cpu',
		key: 'cpu',
		width: 100,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Mem Usage</div>,
		dataIndex: 'memory',
		key: 'memory',
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
			(column) => column.key !== 'volumeName' && column.key !== 'clusterName',
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
	data.map((volume) => ({
		key: volume.volumeName,
		volumeUID: volume.volumeName,
		volumeName: volume.volumeName,
		clusterName: volume.meta.k8s_cluster_name,
		cpu: (
			<ValidateColumnValueWrapper value={volume.cpuUsage}>
				{volume.cpuUsage}
			</ValidateColumnValueWrapper>
		),
		memory: (
			<ValidateColumnValueWrapper value={volume.memoryUsage}>
				{formatBytes(volume.memoryUsage)}
			</ValidateColumnValueWrapper>
		),
		volumeGroup: getGroupByEle(volume, groupBy),
		meta: volume.meta,
		...volume.meta,
		groupedByMeta: volume.meta,
	}));
