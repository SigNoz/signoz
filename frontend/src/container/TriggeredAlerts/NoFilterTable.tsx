/* eslint-disable react/display-name */
import { Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { ResizeTable } from 'components/ResizeTable';
import LabelColumn from 'components/TableRenderer/LabelColumn';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import AlertStatus from 'container/TriggeredAlerts/TableComponents/AlertStatus';
import { useTimezone } from 'providers/Timezone';
import { Alerts } from 'types/api/alerts/getTriggered';

import { Value } from './Filter';
import { FilterAlerts } from './utils';

function NoFilterTable({
	allAlerts,
	selectedFilter,
}: NoFilterTableProps): JSX.Element {
	const filteredAlerts = FilterAlerts(allAlerts, selectedFilter);
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	// need to add the filter
	const columns: ColumnsType<Alerts> = [
		{
			title: 'Status',
			dataIndex: 'status',
			width: 80,
			key: 'status',
			sorter: (a, b): number =>
				b.labels.severity.length - a.labels.severity.length,
			render: (value): JSX.Element => <AlertStatus severity={value.state} />,
		},
		{
			title: 'Alert Name',
			dataIndex: 'labels',
			key: 'alertName',
			width: 100,
			sorter: (a, b): number =>
				(a.labels?.alertname?.charCodeAt(0) || 0) -
				(b.labels?.alertname?.charCodeAt(0) || 0),
			render: (data): JSX.Element => {
				const name = data?.alertname || '';
				return <Typography>{name}</Typography>;
			},
		},
		{
			title: 'Tags',
			dataIndex: 'labels',
			key: 'tags',
			width: 100,
			render: (labels): JSX.Element => {
				const objectKeys = Object.keys(labels);
				const withOutSeverityKeys = objectKeys.filter((e) => e !== 'severity');

				if (withOutSeverityKeys.length === 0) {
					return <Typography>-</Typography>;
				}

				return (
					<LabelColumn labels={withOutSeverityKeys} value={labels} color="magenta" />
				);
			},
		},
		{
			title: 'Severity',
			dataIndex: 'labels',
			key: 'severity',
			width: 100,
			sorter: (a, b): number => {
				const severityValueA = a.labels.severity;
				const severityValueB = b.labels.severity;
				return severityValueA.length - severityValueB.length;
			},
			render: (value): JSX.Element => {
				const objectKeys = Object.keys(value);
				const withSeverityKey = objectKeys.find((e) => e === 'severity') || '';
				const severityValue = value[withSeverityKey];

				return <Typography>{severityValue}</Typography>;
			},
		},
		{
			title: 'Firing Since',
			dataIndex: 'startsAt',
			width: 100,
			sorter: (a, b): number =>
				new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
			render: (date): JSX.Element => (
				<Typography>{`${formatTimezoneAdjustedTimestamp(
					date,
					DATE_TIME_FORMATS.UTC_US,
				)}`}</Typography>
			),
		},
	];

	return (
		<ResizeTable
			columns={columns}
			rowKey={(record): string => `${record.startsAt}-${record.fingerprint}`}
			dataSource={filteredAlerts}
		/>
	);
}

interface NoFilterTableProps {
	allAlerts: Alerts[];
	selectedFilter: Value[];
}

export default NoFilterTable;
