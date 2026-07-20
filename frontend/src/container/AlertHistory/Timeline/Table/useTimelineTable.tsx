import { Ellipsis } from '@signozhq/icons';
import { Button, TableColumnsType as ColumnsType, Tooltip } from 'antd';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { ConditionalAlertPopover } from 'container/AlertHistory/AlertPopover/AlertPopover';
import { TimestampInput } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import AlertLabels from 'pages/AlertDetails/AlertHeader/AlertLabels/AlertLabels';
import AlertState from 'pages/AlertDetails/AlertHeader/AlertState/AlertState';
import { AlertRuleTimelineTableResponse } from 'types/api/alerts/def';

export const timelineTableColumns = ({
	formatTimezoneAdjustedTimestamp,
}: {
	formatTimezoneAdjustedTimestamp: (
		input: TimestampInput,
		format?: string,
	) => string;
}): ColumnsType<AlertRuleTimelineTableResponse> => [
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
			<div className="alert-rule__created-at">
				{formatTimezoneAdjustedTimestamp(value, DATE_TIME_FORMATS.DASH_DATETIME)}
			</div>
		),
	},
	{
		title: 'ACTIONS',
		width: 140,
		align: 'right',
		render: (_, record): JSX.Element => {
			if (!record.relatedTracesLink && !record.relatedLogsLink) {
				return (
					<Tooltip title="No links available for this item">
						<Button type="text" ghost disabled>
							<Ellipsis className="dropdown-icon" size="md" />
						</Button>
					</Tooltip>
				);
			}

			return (
				<ConditionalAlertPopover
					relatedTracesLink={record.relatedTracesLink ?? ''}
					relatedLogsLink={record.relatedLogsLink ?? ''}
				>
					<Button type="text" ghost>
						<Ellipsis className="dropdown-icon" size="md" />
					</Button>
				</ConditionalAlertPopover>
			);
		},
	},
];
