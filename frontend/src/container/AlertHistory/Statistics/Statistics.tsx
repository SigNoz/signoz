import './statistics.styles.scss';

import { useGetAlertRuleDetailsStats } from 'pages/AlertDetails/hooks';
import DataStateRenderer from 'periscope/components/DataStateRenderer/DataStateRenderer';

import AverageResolutionCard from './AverageResolutionCard/AverageResolutionCard';
import TopContributorsCard from './TopContributorsCard/TopContributorsCard';
import TotalTriggeredCard from './TotalTriggeredCard/TotalTriggeredCard';

const isTypeNotNan = (value: unknown): boolean => value !== 'NaN';

const hasTotalTriggeredStats = (
	totalCurrentTriggers: unknown,
	totalPastTriggers: unknown,
): boolean =>
	isTypeNotNan(totalCurrentTriggers) || isTypeNotNan(totalPastTriggers);

const hasAvgResolutionTimeStats = (
	currentAvgResolutionTime: unknown,
	pastAvgResolutionTime: unknown,
): boolean =>
	isTypeNotNan(currentAvgResolutionTime) || isTypeNotNan(pastAvgResolutionTime);

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
						{/* TODO(shaheer): get hasTotalTriggeredStats when it's available in the API */}
						{hasTotalTriggeredStats(totalCurrentTriggers, totalPastTriggers) && (
							<TotalTriggeredCard
								totalCurrentTriggers={totalCurrentTriggers}
								totalPastTriggers={totalPastTriggers}
							/>
						)}

						{/* TODO(shaheer): get hasAvgResolutionTimeStats when it's available in the API */}
						{hasAvgResolutionTimeStats(
							currentAvgResolutionTime,
							pastAvgResolutionTime,
						) && (
							<AverageResolutionCard
								currentAvgResolutionTime={currentAvgResolutionTime}
								pastAvgResolutionTime={pastAvgResolutionTime}
							/>
						)}
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
