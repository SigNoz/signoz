import './FunnelResults.styles.scss';

import Spinner from 'components/Spinner';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useQueryClient } from 'react-query';

import EmptyFunnelResults from './EmptyFunnelResults';
import FunnelGraph from './FunnelGraph';
import OverallMetrics from './OverallMetrics';
import StepsTransitionResults from './StepsTransitionResults';

function FunnelResults(): JSX.Element {
	const {
		validTracesCount,
		isValidateStepsLoading,
		hasIncompleteStepFields,
		hasAllEmptyStepFields,
		hasFunnelBeenExecuted,
		funnelId,
		selectedTime,
	} = useFunnelContext();
	const queryClient = useQueryClient();

	const validateQueryData = queryClient.getQueryData([
		REACT_QUERY_KEY.VALIDATE_FUNNEL_STEPS,
		funnelId,
		selectedTime,
	]);

	if (hasAllEmptyStepFields) return <EmptyFunnelResults />;

	if (hasIncompleteStepFields)
		return (
			<EmptyFunnelResults
				title="Missing service / span names"
				description="Fill in the service and span names for all the steps"
			/>
		);

	if (isValidateStepsLoading || validateQueryData === 'pending') {
		return <Spinner size="large" />;
	}

	if (validTracesCount === 0) {
		return (
			<EmptyFunnelResults
				title="There are no traces that match the funnel steps."
				description="Check the service / span names in the funnel steps and try again to start seeing analytics here"
			/>
		);
	}
	if (!hasFunnelBeenExecuted) {
		return (
			<EmptyFunnelResults
				title="Funnel has not been run yet."
				description="Run the funnel to see the results"
			/>
		);
	}

	return (
		<div className="funnel-results">
			<OverallMetrics />
			<FunnelGraph />
			<StepsTransitionResults />
		</div>
	);
}

export default FunnelResults;
