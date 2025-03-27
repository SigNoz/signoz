import './FunnelResults.styles.scss';

import Spinner from 'components/Spinner';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { FunnelData } from 'types/api/traceFunnels';

import EmptyFunnelResults from './EmptyFunnelResults';
import FunnelGraph from './FunnelGraph';
import OverallMetrics from './OverallMetrics';
import StepsTransitionResults from './StepsTransitionResults';

interface FunnelResultsProps {
	funnel: FunnelData;
}

function FunnelResults({ funnel }: FunnelResultsProps): JSX.Element {
	const {
		validTracesCount,
		isValidateStepsLoading,
		hasIncompleteStepFields,
		hasAllEmptyStepFields,
	} = useFunnelContext();

	if (isValidateStepsLoading) {
		return <Spinner size="large" />;
	}

	if (hasAllEmptyStepFields) return <EmptyFunnelResults />;

	if (hasIncompleteStepFields)
		return (
			<EmptyFunnelResults
				title="Missing service / span names"
				description="Fill in the service and span names for all the steps"
			/>
		);

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
			<StepsTransitionResults funnelId={funnel.id} />
		</div>
	);
}

export default FunnelResults;
