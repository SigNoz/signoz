import { EllipsisOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { ConditionalAlertPopover } from 'container/AlertHistory/AlertPopover/AlertPopover';
import AlertLabels from 'pages/AlertDetails/AlertHeader/AlertLabels/AlertLabels';
import AlertState from 'pages/AlertDetails/AlertHeader/AlertState/AlertState';
import { AlertRuleTimelineTableResponse } from 'types/api/alerts/def';
import { formatEpochTimestamp } from 'utils/timeUtils';

export const timelineTableColumns = (): ColumnsType<AlertRuleTimelineTableResponse> => [
	{
		title: 'STATE',
		dataIndex: 'state',
		sorter: true,
		width: 140,
		render: (value): JSX.Element => (
			<div className="alert-rule-state">
				<AlertState state={value} showLabel />
			</div>
		),
	},
	{
		title: 'LABELS',
		dataIndex: 'labels',
		render: (labels): JSX.Element => (
			<div className="alert-rule-labels">
				<AlertLabels labels={labels} />
			</div>
		),
	},
	{
		title: 'CREATED AT',
		dataIndex: 'unixMilli',
		width: 200,
		render: (value): JSX.Element => (
			<div className="alert-rule__created-at">{formatEpochTimestamp(value)}</div>
		),
	},
	{
		title: 'ACTIONS',
		width: 140,
		align: 'right',
		render: (record): JSX.Element => (
			<ConditionalAlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<Button type="text" ghost>
					<EllipsisOutlined className="dropdown-icon" />
				</Button>
			</ConditionalAlertPopover>
		),
	},
];
