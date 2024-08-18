import './topContributorsCard.styles.scss';

import { Button, Progress } from 'antd';
import AlertPopover from 'container/AlertHistory/AlertPopover/AlertPopover';
import { ArrowRight } from 'lucide-react';
import AlertLabels from 'pages/AlertDetails/AlertHeader/AlertLabels/AlertLabels';
import { AlertRuleStats, AlertRuleTopContributors } from 'types/api/alerts/def';

import { statsData } from '../mocks';

function TopContributorsContent({
	topContributorsData,
	totalCurrentTriggers,
}: TopContributorsCardProps): JSX.Element {
	const isEmpty = !topContributorsData.length;

	if (isEmpty) {
		return (
			<div className="empty-content">
				<div className="empty-content__icon">ℹ️</div>
				<div className="empty-content__text">
					<span className="bold-text">Add Group By Field</span> To view top
					contributors, please add at least one group by field to your query.
				</div>
				<div className="empty-content__button-wrapper">
					<Button type="default" className="configure-alert-rule-button">
						Configure Alert Rule
					</Button>
				</div>
			</div>
		);
	}

	return (
		<>
			{topContributorsData.slice(0, 3).map((contributor, index) => (
				<AlertPopover // eslint-disable-next-line react/no-array-index-key
					key={`contributor-${index}`}
				>
					<div className="contributors-row">
						<div className="labels-wrapper">
							<AlertLabels labels={contributor.labels} />
						</div>
						<div className="contribution-progress-bar">
							<Progress
								percent={(contributor.count / statsData.totalCurrentTriggers) * 100}
								showInfo={false}
								trailColor="rgba(255, 255, 255, 0)"
								strokeColor="var(--bg-robin-500)"
							/>
						</div>
						<div className="total-contribution">
							{contributor.count}/{totalCurrentTriggers}
						</div>
					</div>
				</AlertPopover>
			))}
		</>
	);
}
type TopContributorsCardProps = {
	topContributorsData: AlertRuleTopContributors[];
	totalCurrentTriggers: AlertRuleStats['totalCurrentTriggers'];
};
function TopContributorsCard({
	topContributorsData,
	totalCurrentTriggers,
}: TopContributorsCardProps): JSX.Element {
	return (
		<div className="top-contributors-card">
			<div className="top-contributors-card__header">
				<div className="title">top contributors</div>
				<div className="view-all">
					<div className="label">View all</div>
					<div className="icon">
						<ArrowRight size={14} color="var(--bg-vanilla-400)" />
					</div>
				</div>
			</div>
			<div className="top-contributors-card__content">
				<TopContributorsContent
					topContributorsData={topContributorsData}
					totalCurrentTriggers={totalCurrentTriggers}
				/>
			</div>
		</div>
	);
}

export default TopContributorsCard;
