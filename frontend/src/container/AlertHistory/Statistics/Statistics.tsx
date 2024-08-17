import './statistics.styles.scss';

import { useGetAlertRuleDetailsStats } from 'pages/AlertDetails/hooks';
import DataStateRenderer from 'periscope/components/DataStateRenderer/DataStateRenderer';

import AverageResolutionCard from './AverageResolutionCard/AverageResolutionCard';
import TopContributorsCard from './TopContributorsCard/TopContributorsCard';
import TotalTriggeredCard from './TotalTriggeredCard/TotalTriggeredCard';

function StatsCardsRenderer(): JSX.Element {
	const {
		isLoading,
		isRefetching,
		isError,
		data,
		isValidRuleId,
		ruleId,
	} = useGetAlertRuleDetailsStats();

	return (
		<DataStateRenderer
			isLoading={isLoading}
			isRefetching={isRefetching}
			isError={isError || !isValidRuleId || !ruleId}
			data={data?.payload?.data || null}
		>
			{(data): JSX.Element => {
				const {
					currentAvgResolutionTime,
					pastAvgResolutionTime,
					totalCurrentTriggers,
					totalPastTriggers,
				} = data;

				return (
					<>
						<TotalTriggeredCard
							totalCurrentTriggers={totalCurrentTriggers}
							totalPastTriggers={totalPastTriggers}
						/>
						<AverageResolutionCard
							currentAvgResolutionTime={currentAvgResolutionTime}
							pastAvgResolutionTime={pastAvgResolutionTime}
						/>
					</>
				);
			}}
		</DataStateRenderer>
	);
}
function Statistics(): JSX.Element {
	return (
		<div className="statistics">
			<StatsCardsRenderer />
			<TopContributorsCard />
		</div>
	);
}

export default Statistics;
