import { AlertRuleStats } from 'types/api/alerts/def';
import { formatTime } from 'utils/timeUtils';

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
		<StatsCard
			displayValue={formatTime(currentAvgResolutionTime)}
			totalCurrentCount={currentAvgResolutionTime}
			totalPastCount={pastAvgResolutionTime}
			title="Avg. Resolution Time"
		/>
	);
}

export default AverageResolutionCard;
