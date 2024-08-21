import { useGetAlertRuleDetailsStats } from 'pages/AlertDetails/hooks';
import DataStateRenderer from 'periscope/components/DataStateRenderer/DataStateRenderer';
import { useEffect } from 'react';

import AverageResolutionCard from '../AverageResolutionCard/AverageResolutionCard';
import StatsCard from '../StatsCard/StatsCard';
import TotalTriggeredCard from '../TotalTriggeredCard/TotalTriggeredCard';

const isTypeNotNan = (value: unknown): boolean => value !== 'NaN';

const hasTotalTriggeredStats = (
	totalCurrentTriggers: unknown,
	totalPastTriggers: unknown,
): boolean =>
	(isTypeNotNan(totalCurrentTriggers) && isTypeNotNan(totalPastTriggers)) ||
	isTypeNotNan(totalCurrentTriggers);

const hasAvgResolutionTimeStats = (
	currentAvgResolutionTime: unknown,
	pastAvgResolutionTime: unknown,
): boolean =>
	(isTypeNotNan(currentAvgResolutionTime) &&
		isTypeNotNan(pastAvgResolutionTime)) ||
	isTypeNotNan(currentAvgResolutionTime);

type StatsCardsRendererProps = {
	setTotalCurrentTriggers: (value: number) => void;
};

// TODO(shaheer): render the DataStateRenderer inside the TotalTriggeredCard/AverageResolutionCard, it should display the title
function StatsCardsRenderer({
	setTotalCurrentTriggers,
}: StatsCardsRendererProps): JSX.Element {
	const {
		isLoading,
		isRefetching,
		isError,
		data,
		isValidRuleId,
		ruleId,
	} = useGetAlertRuleDetailsStats();

	useEffect(() => {
		if (data?.payload?.data?.totalCurrentTriggers !== undefined) {
			setTotalCurrentTriggers(data.payload.data.totalCurrentTriggers);
		}
	}, [data, setTotalCurrentTriggers]);

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
					currentAvgResolutionTimeSeries,
					currentTriggersSeries,
				} = data;

				return (
					<>
						{/* TODO(shaheer): get hasTotalTriggeredStats when it's available in the API */}
						{hasTotalTriggeredStats(totalCurrentTriggers, totalPastTriggers) ? (
							<TotalTriggeredCard
								totalCurrentTriggers={totalCurrentTriggers}
								totalPastTriggers={totalPastTriggers}
								timeSeries={currentTriggersSeries?.values}
							/>
						) : (
							<StatsCard
								title="Total Triggered"
								isEmpty
								emptyMessage="None Triggered."
							/>
						)}

						{/* TODO(shaheer): get hasAvgResolutionTimeStats when it's available in the API */}
						{hasAvgResolutionTimeStats(
							currentAvgResolutionTime,
							pastAvgResolutionTime,
						) ? (
							<AverageResolutionCard
								currentAvgResolutionTime={currentAvgResolutionTime}
								pastAvgResolutionTime={pastAvgResolutionTime}
								timeSeries={currentAvgResolutionTimeSeries?.values}
							/>
						) : (
							<StatsCard
								title="Avg. Resolution Time"
								isEmpty
								emptyMessage="No Resolutions."
							/>
						)}
					</>
				);
			}}
		</DataStateRenderer>
	);
}

export default StatsCardsRenderer;
