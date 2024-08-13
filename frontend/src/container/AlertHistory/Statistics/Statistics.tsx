import './statistics.styles.scss';

import AverageResolutionCard from './AverageResolutionCard/AverageResolutionCard';
import TopContributorsCard from './TopContributorsCard/TopContributorsCard';
import TotalTriggeredCard from './TotalTriggeredCard/TotalTriggeredCard';

function Statistics(): JSX.Element {
	return (
		<div className="statistics">
			<TotalTriggeredCard />
			<AverageResolutionCard />
			<TopContributorsCard />
		</div>
	);
}

export default Statistics;
