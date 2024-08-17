import './averageResolutionCard.styles.scss';

import { AlertRuleStats } from 'types/api/alerts/def';

import StatsCard from '../StatsCard/StatsCard';

type TotalTriggeredCardProps = {
	currentAvgResolutionTime: AlertRuleStats['currentAvgResolutionTime'];
	pastAvgResolutionTime: AlertRuleStats['pastAvgResolutionTime'];
};

function AverageResolutionCard({
	currentAvgResolutionTime,
	pastAvgResolutionTime,
}: TotalTriggeredCardProps): JSX.Element {
	return (
		<div className="average-resolution-card">
			<StatsCard
				totalCurrentCount={currentAvgResolutionTime}
				totalPastCount={pastAvgResolutionTime}
				title="Avg. Resolution Time"
			/>
		</div>
	);
}

export default AverageResolutionCard;
