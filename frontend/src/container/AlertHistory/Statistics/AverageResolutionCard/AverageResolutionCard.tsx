import './averageResolutionCard.styles.scss';

import { statsData } from '../mocks';
import StatsCard from '../StatsCard/StatsCard';

function AverageResolutionCard(): JSX.Element {
	return (
		<div className="average-resolution-card">
			<StatsCard
				totalCurrentCount={statsData.totalCurrentTriggers}
				totalPastCount={statsData.totalPastTriggers}
				title="Avg. Resolution Time"
			/>
		</div>
	);
}

export default AverageResolutionCard;
