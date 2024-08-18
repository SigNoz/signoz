import './statistics.styles.scss';

import { useState } from 'react';

import StatsCardsRenderer from './StatsCardsRenderer/StatsCardsRenderer';
import TopContributorsRenderer from './TopContributorsRenderer/TopContributorsRenderer';

function Statistics(): JSX.Element {
	const [totalCurrentTriggers, setTotalCurrentTriggers] = useState(0);
	return (
		<div className="statistics">
			<StatsCardsRenderer setTotalCurrentTriggers={setTotalCurrentTriggers} />
			<TopContributorsRenderer totalCurrentTriggers={totalCurrentTriggers} />
		</div>
	);
}

export default Statistics;
