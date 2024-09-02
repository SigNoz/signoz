import './Statistics.styles.scss';

import { AlertRuleStats } from 'types/api/alerts/def';

import StatsCardsRenderer from './StatsCardsRenderer/StatsCardsRenderer';
import TopContributorsRenderer from './TopContributorsRenderer/TopContributorsRenderer';

function Statistics({
	setTotalCurrentTriggers,
	totalCurrentTriggers,
}: {
	setTotalCurrentTriggers: (value: number) => void;
	totalCurrentTriggers: AlertRuleStats['totalCurrentTriggers'];
}): JSX.Element {
	return (
		<div className="statistics">
			<StatsCardsRenderer setTotalCurrentTriggers={setTotalCurrentTriggers} />
			<TopContributorsRenderer totalCurrentTriggers={totalCurrentTriggers} />
		</div>
	);
}

export default Statistics;
