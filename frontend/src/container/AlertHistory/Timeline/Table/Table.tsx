import './table.styles.scss';

import { Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import AlertPopover from 'container/AlertHistory/AlertPopover/AlertPopover';
import AlertLabels from 'pages/AlertDetails/AlertHeader/AlertLabels/AlertLabels';
import AlertState from 'pages/AlertDetails/AlertHeader/AlertState/AlertState';
import { useTimelineTable } from 'pages/AlertDetails/hooks';
import { AlertRuleTimelineTableResponse } from 'types/api/alerts/def';
import { formatEpochTimestamp } from 'utils/timeUtils';

const columns: ColumnsType<AlertRuleTimelineTableResponse> = [
	{
		title: 'STATE',
		dataIndex: 'state',
		render: (value): JSX.Element => (
			<AlertPopover>
				<div className="alert-rule-state">
					<AlertState state={value} showLabel />
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

type TimelineTableProps = {
	timelineData: AlertRuleTimelineTableResponse[];
};

function TimelineTable({ timelineData }: TimelineTableProps): JSX.Element {
	const { paginationConfig, onChangeHandler } = useTimelineTable();
	return (
		<div className="timeline-table">
			<Table
				columns={columns}
				dataSource={timelineData}
				pagination={paginationConfig}
				size="middle"
				onChange={onChangeHandler}
				// TODO(shaheer): get total entries when we get an API for it
			/>
		</div>
	);
}

export default TimelineTable;
