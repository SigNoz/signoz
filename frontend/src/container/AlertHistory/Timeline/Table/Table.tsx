import './table.styles.scss';

import { Table, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import AlertPopover from 'container/AlertHistory/AlertPopover/AlertPopover';
import { timelineData } from 'container/AlertHistory/Statistics/mocks';
import AlertIcon from 'pages/AlertDetails/AlertHeader/AlertIcon/AlertIcon';
import AlertLabels from 'pages/AlertDetails/AlertHeader/AlertLabels/AlertLabels';
import { formatEpochTimestamp } from 'utils/timeUtils';

interface DataType {
	state: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	labels: Record<string, any>;
	value: number;
	unixMilli: string;
}

const columns: ColumnsType<DataType> = [
	{
		title: 'STATE',
		dataIndex: 'state',
		render: (value): JSX.Element => (
			<AlertPopover>
				<div className="alert-rule-state">
					<AlertIcon state={value} showLabel />
				</div>
			</AlertPopover>
		),
	},
	{
		title: 'LABELS',
		dataIndex: 'labels',
		render: (labels): JSX.Element => (
			<AlertPopover>
				<div className="alert-rule-labels">
					<AlertLabels labels={labels} />
				</div>
			</AlertPopover>
		),
	},
	{
		title: 'VALUE',
		dataIndex: 'value',
		render: (value): JSX.Element => (
			<AlertPopover>
				<div className="alert-rule-value">{value}</div>
			</AlertPopover>
		),
	},
	{
		title: 'CREATED AT',
		dataIndex: 'unixMilli',
		render: (value): JSX.Element => (
			<AlertPopover>
				<div className="alert-rule-created-at">{formatEpochTimestamp(value)}</div>
			</AlertPopover>
		),
	},
];

const showPaginationItem = (total: number, range: number[]): JSX.Element => (
	<>
		<Typography.Text className="numbers">
			{range[0]} &#8212; {range[1]}
		</Typography.Text>
		<Typography.Text className="total"> of {total}</Typography.Text>
	</>
);

function TimelineTable(): JSX.Element {
	const paginationConfig = timelineData.length > 20 && {
		pageSize: 20,
		showTotal: showPaginationItem,
		showSizeChanger: false,
		hideOnSinglePage: true,
	};
	return (
		<div className="timeline-table">
			<Table
				columns={columns}
				dataSource={timelineData}
				pagination={paginationConfig}
				size="middle"
			/>
		</div>
	);
}

export default TimelineTable;
