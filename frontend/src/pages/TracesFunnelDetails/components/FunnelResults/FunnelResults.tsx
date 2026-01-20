import './FunnelResults.styles.scss';

import Spinner from 'components/Spinner';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useIsMutating } from 'react-query';

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
		funnelId,
	} = useFunnelContext();

	const isFunnelUpdateMutating = useIsMutating([
		REACT_QUERY_KEY.UPDATE_FUNNEL_STEPS,
		funnelId,
	]);

	if (hasAllEmptyStepFields) return <EmptyFunnelResults />;

	if (hasIncompleteStepFields)
		return (
			<EmptyFunnelResults
				title="Missing service / span names"
				description="Fill in the service and span names for all the steps"
			/>
		);

	if (isValidateStepsLoading || isFunnelUpdateMutating) {
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

	return (
		<div className="funnel-results">
			<OverallMetrics />
			<FunnelGraph />
			<StepsTransitionResults />
		</div>
	);
}

export default FunnelResults;
