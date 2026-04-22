import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Progress, TableColumnType as ColumnType, Tag, Tooltip } from 'antd';
import { HostData } from 'api/infraMonitoring/getHostLists';
import { K8sRenderedRowData } from 'container/InfraMonitoringK8s/Base/types';
import { IEntityColumn } from 'container/InfraMonitoringK8s/Base/useInfraMonitoringTableColumnsStore';
import {
	getGroupByEl,
	getGroupedByMeta,
	getRowKey,
} from 'container/InfraMonitoringK8s/Base/utils';
import { ValidateColumnValueWrapper } from 'container/InfraMonitoringK8s/commonUtils';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8s/constants';
import { Group } from 'lucide-react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { getMemoryProgressColor, getProgressColor } from './constants';
import { HostnameCell } from './utils';

import styles from './table.module.scss';

export const hostColumns: IEntityColumn[] = [
	{
		label: 'Host group',
		value: 'hostGroup',
		id: 'hostGroup',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'hidden-on-collapse',
	},
	{
		label: 'Hostname',
		value: 'hostName',
		id: 'hostName',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'hidden-on-expand',
	},
	{
		label: 'Status',
		value: 'active',
		id: 'active',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'CPU Usage',
		value: 'cpu',
		id: 'cpu',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Memory Usage',
		value: 'memory',
		id: 'memory',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'IOWait',
		value: 'wait',
		id: 'wait',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Load Avg',
		value: 'load15',
		id: 'load15',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
];

export const hostColumnsConfig: ColumnType<K8sRenderedRowData>[] = [
	{
		title: (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> HOST GROUP
			</div>
		),
		dataIndex: 'hostGroup',
		key: 'hostGroup',
		ellipsis: true,
		width: 180,
		sorter: false,
	},
	{
		title: <div className={styles.hostnameColumnHeader}>Hostname</div>,
		dataIndex: 'hostName',
		key: 'hostName',
		width: 250,
		render: (_value, record): React.ReactNode => (
			<HostnameCell
				hostName={typeof record.hostName === 'string' ? record.hostName : ''}
			/>
		),
	},
	{
		title: (
			<div className={styles.statusHeader}>
				Status
				<Tooltip title="Sent system metrics in last 10 mins">
					<InfoCircleOutlined />
				</Tooltip>
			</div>
		),
		dataIndex: 'active',
		key: 'active',
		width: 100,
	},
	{
		title: <div className={styles.columnHeaderRight}>CPU Usage</div>,
		dataIndex: 'cpu',
		key: 'cpu',
		width: 100,
		sorter: true,
		align: 'right',
	},
	{
		title: (
			<div className={`${styles.columnHeaderRight} ${styles.memoryUsageHeader}`}>
				Memory Usage
				<Tooltip title="Excluding cache memory">
					<InfoCircleOutlined />
				</Tooltip>
			</div>
		),
		dataIndex: 'memory',
		key: 'memory',
		width: 100,
		sorter: true,
		align: 'right',
	},
	{
		title: <div className={styles.columnHeaderRight}>IOWait</div>,
		dataIndex: 'wait',
		key: 'wait',
		width: 100,
		sorter: true,
		align: 'right',
	},
	{
		title: <div className={styles.columnHeaderRight}>Load Avg</div>,
		dataIndex: 'load15',
		key: 'load15',
		width: 100,
		sorter: true,
		align: 'right',
	},
];

function hostRowSource(host: HostData): { meta: Record<string, string> } {
	return {
		meta: {
			...(host.meta ?? {}),
			host_name: host.hostName ?? '',
			'host.name': host.hostName ?? '',
			os_type: host.os ?? '',
			'os.type': host.os ?? '',
		},
	};
}

export const hostRenderRowData = (
	host: HostData,
	groupBy: BaseAutocompleteData[],
): K8sRenderedRowData => {
	const synthetic = hostRowSource(host);
	const rowKey = getRowKey(synthetic, () => host.hostName || 'unknown', groupBy);
	const groupedByMeta = getGroupedByMeta(synthetic, groupBy);
	const cpuPercent = Number((host.cpu * 100).toFixed(1));
	const memoryPercent = Number((host.memory * 100).toFixed(1));

	return {
		key: rowKey,
		itemKey: host.hostName ?? '',
		groupedByMeta,
		meta: synthetic.meta,
		hostGroup: getGroupByEl(synthetic, groupBy),
		...synthetic.meta,
		hostName: host.hostName ?? '',
		active: (
			<Tag
				bordered
				className={`${styles.statusTag} ${
					host.active ? styles.statusTagActive : styles.statusTagInactive
				}`}
			>
				{host.active ? 'ACTIVE' : 'INACTIVE'}
			</Tag>
		),
		cpu: (
			<div className={styles.progressContainer}>
				<ValidateColumnValueWrapper
					value={host.cpu}
					entity={InfraMonitoringEntity.HOSTS}
				>
					<Progress
						percent={cpuPercent}
						strokeLinecap="butt"
						size="small"
						strokeColor={getProgressColor(cpuPercent)}
						className={styles.progressBar}
					/>
				</ValidateColumnValueWrapper>
			</div>
		),
		memory: (
			<div className={styles.progressContainer}>
				<ValidateColumnValueWrapper
					value={host.memory}
					entity={InfraMonitoringEntity.HOSTS}
				>
					<Progress
						percent={memoryPercent}
						strokeLinecap="butt"
						size="small"
						strokeColor={getMemoryProgressColor(memoryPercent)}
						className={styles.progressBar}
					/>
				</ValidateColumnValueWrapper>
			</div>
		),
		wait: `${Number((host.wait * 100).toFixed(1))}%`,
		load15: host.load15,
	};
};
