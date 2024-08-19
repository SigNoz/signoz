import { Progress, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import AlertPopover from 'container/AlertHistory/AlertPopover/AlertPopover';
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
			width: '50%',
			render: (labels: AlertRuleTopContributors['labels']): JSX.Element => (
				<AlertPopover>
					<div>
						<AlertLabels labels={labels} />
					</div>
				</AlertPopover>
			),
		},
		{
			title: 'progressBar',
			dataIndex: 'count',
			key: 'progressBar',
			width: '40%',
			render: (count: AlertRuleTopContributors['count']): JSX.Element => (
				<AlertPopover>
					<Progress
						percent={(count / totalCurrentTriggers) * 100}
						showInfo={false}
						trailColor="rgba(255, 255, 255, 0)"
						strokeColor="var(--bg-robin-500)"
					/>
				</AlertPopover>
			),
		},
		{
			title: 'count',
			dataIndex: 'count',
			key: 'count',
			width: '10%',
			render: (count: AlertRuleTopContributors['count']): JSX.Element => (
				<AlertPopover>
					<div className="total-contribution">
						{count}/{totalCurrentTriggers}
					</div>
				</AlertPopover>
			),
		},
	];

	return (
		<Table
			rowClassName="contributors-row"
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
