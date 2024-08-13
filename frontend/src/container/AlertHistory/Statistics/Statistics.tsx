import './statistics.styles.scss';

import TopContributorsCard from './TopContributorsCard/TopContributorsCard';

function Statistics(): JSX.Element {
	return (
		<div className="statistics">
			<TopContributorsCard />
		</div>
	);
}

export default Statistics;
