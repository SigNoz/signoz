import { Progress, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import AlertPopover from 'container/AlertHistory/AlertPopover/AlertPopover';
import AlertLabels from 'pages/AlertDetails/AlertHeader/AlertLabels/AlertLabels';
import PaginationInfoText from 'periscope/components/PaginationInfoText/PaginationInfoText';
import React from 'react';
import { AlertRuleStats, AlertRuleTopContributors } from 'types/api/alerts/def';

type ConditionalAlertPopoverProps = {
	relatedTracesLink: string;
	relatedLogsLink: string;
	children: React.ReactNode;
};
function ConditionalAlertPopover({
	children,
	relatedTracesLink,
	relatedLogsLink,
}: ConditionalAlertPopoverProps): JSX.Element {
	if (relatedTracesLink && relatedLogsLink) {
		return (
			<AlertPopover
				relatedTracesLink={relatedTracesLink}
				relatedLogsLink={relatedLogsLink}
			>
				{children}
			</AlertPopover>
		);
	}
	return <div>{children}</div>;
}

function TopContributorsRows({
	topContributors,
	totalCurrentTriggers,
}: {
	topContributors: AlertRuleTopContributors[];
	totalCurrentTriggers: AlertRuleStats['totalCurrentTriggers'];
}): JSX.Element {
	const columns: ColumnsType<AlertRuleTopContributors> = [
		{
			title: 'labels',
			dataIndex: 'labels',
			key: 'labels',
			width: '50%',
			render: (
				labels: AlertRuleTopContributors['labels'],
				record,
			): JSX.Element => (
				<ConditionalAlertPopover
					relatedTracesLink={record.relatedTracesLink}
					relatedLogsLink={record.relatedLogsLink}
				>
					<div>
						<AlertLabels labels={labels} />
					</div>
				</ConditionalAlertPopover>
			),
		},
		{
			title: 'progressBar',
			dataIndex: 'count',
			key: 'progressBar',
			width: '40%',
			render: (count: AlertRuleTopContributors['count'], record): JSX.Element => (
				<ConditionalAlertPopover
					relatedTracesLink={record.relatedTracesLink}
					relatedLogsLink={record.relatedLogsLink}
				>
					<Progress
						percent={(count / totalCurrentTriggers) * 100}
						showInfo={false}
						trailColor="rgba(255, 255, 255, 0)"
						strokeColor="var(--bg-robin-500)"
					/>
				</ConditionalAlertPopover>
			),
		},
		{
			title: 'count',
			dataIndex: 'count',
			key: 'count',
			width: '10%',
			render: (count: AlertRuleTopContributors['count'], record): JSX.Element => (
				<ConditionalAlertPopover
					relatedTracesLink={record.relatedTracesLink}
					relatedLogsLink={record.relatedLogsLink}
				>
					<div className="total-contribution">
						{count}/{totalCurrentTriggers}
					</div>
				</ConditionalAlertPopover>
			),
		},
	];

	return (
		<Table
			rowClassName="contributors-row"
			rowKey={(row): string => `top-contributor-${row.fingerprint}`}
			columns={columns}
			showHeader={false}
			dataSource={topContributors}
			pagination={
				topContributors.length > 10 ? { showTotal: PaginationInfoText } : false
			}
		/>
	);
}

export default TopContributorsRows;