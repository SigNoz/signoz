import { Color } from '@signozhq/design-tokens';
import { Progress, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { ConditionalAlertPopover } from 'container/AlertHistory/AlertPopover/AlertPopover';
import AlertLabels from 'pages/AlertDetails/AlertHeader/AlertLabels/AlertLabels';
import PaginationInfoText from 'periscope/components/PaginationInfoText/PaginationInfoText';
import { AlertRuleStats, AlertRuleTopContributors } from 'types/api/alerts/def';

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
			width: '51%',
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
			width: '39%',
			render: (count: AlertRuleTopContributors['count'], record): JSX.Element => (
				<ConditionalAlertPopover
					relatedTracesLink={record.relatedTracesLink}
					relatedLogsLink={record.relatedLogsLink}
				>
					<Progress
						percent={(count / totalCurrentTriggers) * 100}
						showInfo={false}
						trailColor="rgba(255, 255, 255, 0)"
						strokeColor={Color.BG_ROBIN_500}
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
