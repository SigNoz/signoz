import { ColumnsType } from 'antd/es/table';
import { ConditionalAlertPopover } from 'container/AlertHistory/AlertPopover/AlertPopover';
import AlertLabels from 'pages/AlertDetails/AlertHeader/AlertLabels/AlertLabels';
import AlertState from 'pages/AlertDetails/AlertHeader/AlertState/AlertState';
import { AlertRuleTimelineTableResponse } from 'types/api/alerts/def';
import { formatEpochTimestamp } from 'utils/timeUtils';

export const timelineTableColumns = (): // currentUnit?: string,
// targetUnit?: string,
ColumnsType<AlertRuleTimelineTableResponse> => [
	{
		title: 'STATE',
		dataIndex: 'state',
		sorter: true,
		width: '12.5%',
		render: (value, record): JSX.Element => (
			<ConditionalAlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-state">
					<AlertState state={value} showLabel />
				</div>
			</ConditionalAlertPopover>
		),
	},
	{
		title: 'LABELS',
		dataIndex: 'labels',
		width: '54.5%',
		render: (labels, record): JSX.Element => (
			<ConditionalAlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-labels">
					<AlertLabels labels={labels} />
				</div>
			</ConditionalAlertPopover>
		),
	},
	// temporarily comment value column
	// {
	// 	title: 'VALUE',
	// 	dataIndex: 'value',
	// 	width: '14%',
	// 	render: (value, record): JSX.Element => (
	// 		<ConditionalAlertPopover
	// 			relatedTracesLink={record.relatedTracesLink}
	// 			relatedLogsLink={record.relatedLogsLink}
	// 		>
	// 			<div className="alert-rule-value">
	// 				{/* convert the value based on y axis and target unit */}
	// 				{convertValue(value.toFixed(2), currentUnit, targetUnit)}
	// 			</div>
	// 		</ConditionalAlertPopover>
	// 	),
	// },
	{
		title: 'CREATED AT',
		dataIndex: 'unixMilli',
		width: '32.5%',
		render: (value, record): JSX.Element => (
			<ConditionalAlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-created-at">{formatEpochTimestamp(value)}</div>
			</ConditionalAlertPopover>
		),
	},
];
