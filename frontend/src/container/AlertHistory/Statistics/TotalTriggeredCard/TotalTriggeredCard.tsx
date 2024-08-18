import { AlertRuleStats } from 'types/api/alerts/def';

import StatsCard from '../StatsCard/StatsCard';

type TotalTriggeredCardProps = {
	totalCurrentTriggers: AlertRuleStats['totalCurrentTriggers'];
	totalPastTriggers: AlertRuleStats['totalPastTriggers'];
};

function TotalTriggeredCard({
	totalCurrentTriggers,
	totalPastTriggers,
}: TotalTriggeredCardProps): JSX.Element {
	return (
		<StatsCard
			totalCurrentCount={totalCurrentTriggers}
			totalPastCount={totalPastTriggers}
			title="Total Triggered"
		/>
	);
}

export default TotalTriggeredCard;
