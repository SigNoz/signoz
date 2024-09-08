import { useGetAlertRuleDetailsTopContributors } from 'pages/AlertDetails/hooks';
import DataStateRenderer from 'periscope/components/DataStateRenderer/DataStateRenderer';
import { AlertRuleStats } from 'types/api/alerts/def';

import TopContributorsCard from '../TopContributorsCard/TopContributorsCard';

type TopContributorsRendererProps = {
	totalCurrentTriggers: AlertRuleStats['totalCurrentTriggers'];
};

function TopContributorsRenderer({
	totalCurrentTriggers,
}: TopContributorsRendererProps): JSX.Element {
	const {
		isLoading,
		isRefetching,
		isError,
		data,
		isValidRuleId,
		ruleId,
	} = useGetAlertRuleDetailsTopContributors();
	const response = data?.payload?.data;

	// TODO(shaheer): render the DataStateRenderer inside the TopContributorsCard, it should display the title and view all
	return (
		<DataStateRenderer
			isLoading={isLoading}
			isRefetching={isRefetching}
			isError={isError || !isValidRuleId || !ruleId}
			data={response || null}
		>
			{(topContributorsData): JSX.Element => (
				<TopContributorsCard
					topContributorsData={topContributorsData}
					totalCurrentTriggers={totalCurrentTriggers}
				/>
			)}
		</DataStateRenderer>
	);
}

export default TopContributorsRenderer;
