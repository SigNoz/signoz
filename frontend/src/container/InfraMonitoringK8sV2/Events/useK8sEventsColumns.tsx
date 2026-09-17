import { useMemo } from 'react';
import { TableColumnsType } from 'antd';
import { useTimezone } from 'providers/Timezone';

import EventObjectCell from './EventObjectCell';
import { K8sEventRow } from './types';
import { isWarningSeverity } from './utils';

import styles from './K8sEventsList.module.scss';

const EMPTY_CELL = '—';

export function useK8sEventsColumns(
	onDrillDown: (record: K8sEventRow) => void,
): TableColumnsType<K8sEventRow> {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	return useMemo(
		() => [
			{
				title: 'Severity',
				dataIndex: 'severity',
				key: 'severity',
				width: 100,
				render: (value: string): JSX.Element => (
					<span
						className={isWarningSeverity(value) ? styles.isWarning : styles.isNormal}
					>
						{value || EMPTY_CELL}
					</span>
				),
			},
			{
				title: 'Timestamp',
				dataIndex: 'timestamp',
				key: 'timestamp',
				width: 190,
				ellipsis: true,
				render: (value: string | number): string =>
					formatTimezoneAdjustedTimestamp(
						typeof value === 'string' ? value : value / 1e6,
					),
			},
			{
				title: 'Kind',
				dataIndex: 'kind',
				key: 'kind',
				width: 110,
				render: (value: string): string => value || EMPTY_CELL,
			},
			{
				title: 'Object',
				dataIndex: 'objectName',
				key: 'objectName',
				width: 200,
				ellipsis: true,
				render: (_value: string, record: K8sEventRow): JSX.Element => (
					<EventObjectCell record={record} onDrillDown={onDrillDown} />
				),
			},
			{
				title: 'Namespace',
				dataIndex: 'namespace',
				key: 'namespace',
				width: 140,
				ellipsis: true,
				render: (value: string): string => value || EMPTY_CELL,
			},
			{
				title: 'Reason',
				dataIndex: 'reason',
				key: 'reason',
				width: 160,
				ellipsis: true,
				render: (value: string): string => value || EMPTY_CELL,
			},
			{ title: 'Message', dataIndex: 'body', key: 'body' },
		],
		[formatTimezoneAdjustedTimestamp, onDrillDown],
	);
}
