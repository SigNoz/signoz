import './totalTriggeredCard.styles.scss';

import { statsData } from '../mocks';
import StatsCard from '../StatsCard/StatsCard';

function TotalTriggeredCard(): JSX.Element {
	return (
		<div className="total-triggered-card">
			<StatsCard
				totalCurrentCount={statsData.currentAvgResolutionTime}
				totalPastCount={statsData.pastAvgResolutionTime}
				title="Total Triggered"
			/>
		</div>
	);
}

export default TotalTriggeredCard;
