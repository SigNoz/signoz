import { useMemo } from 'react';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import ErrorContent from 'components/ErrorModal/components/ErrorContent';
import { useGetAlertRuleDetailsTopContributors } from 'pages/AlertDetails/hooks';
import { labelsArrayToObject } from 'container/AlertHistory/utils/labelAdapters';
import DataStateRenderer from 'periscope/components/DataStateRenderer/DataStateRenderer';
import { AlertRuleStats, AlertRuleTopContributors } from 'types/api/alerts/def';

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
		error,
		isValidRuleId,
		ruleId,
	} = useGetAlertRuleDetailsTopContributors();
	const apiError = useMemo(() => convertToApiError(error), [error]);

	// TODO(shaheer): render the DataStateRenderer inside the TopContributorsCard, it should display the title and view all
	const adaptedData = useMemo((): AlertRuleTopContributors[] | null => {
		if (!data?.data) {
			return null;
		}
		return data.data.map((contributor) => ({
			fingerprint: contributor.fingerprint,
			count: contributor.count,
			labels: labelsArrayToObject(contributor.labels),
			relatedLogsLink: contributor.relatedLogsLink ?? '',
			relatedTracesLink: contributor.relatedTracesLink ?? '',
			relatedAITracesLink: contributor.relatedAITracesLink ?? '',
		}));
	}, [data?.data]);

	if (apiError) {
		return (
			<div data-testid="top-contributors-error">
				<ErrorContent error={apiError} />
			</div>
		);
	}

	return (
		<DataStateRenderer
			isLoading={isLoading}
			isRefetching={isRefetching}
			isError={isError || !isValidRuleId || !ruleId}
			data={adaptedData}
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
