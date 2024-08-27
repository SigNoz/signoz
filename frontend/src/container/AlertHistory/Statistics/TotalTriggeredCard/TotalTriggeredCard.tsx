import { AlertRuleStats } from 'types/api/alerts/def';

import StatsCard from '../StatsCard/StatsCard';

type TotalTriggeredCardProps = {
	totalCurrentTriggers: AlertRuleStats['totalCurrentTriggers'];
	totalPastTriggers: AlertRuleStats['totalPastTriggers'];
	timeSeries: AlertRuleStats['currentTriggersSeries']['values'];
};

function TotalTriggeredCard({
	totalCurrentTriggers,
	totalPastTriggers,
	timeSeries,
}: TotalTriggeredCardProps): JSX.Element {
	return (
		<StatsCard
			totalCurrentCount={totalCurrentTriggers}
			totalPastCount={totalPastTriggers}
			title="Total Triggered"
			timeSeries={timeSeries}
		/>
	);
}

export default TotalTriggeredCard;
