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
		hasIncompleteSteps,
	} = useFunnelContext();

	if (isValidateStepsLoading) {
		return <Spinner size="large" />;
	}

	if (hasIncompleteSteps) return <EmptyFunnelResults />;

	if (validTracesCount === 0) {
		return (
			<EmptyFunnelResults
				title="There are no traces that match the funnel steps."
				description="Add spans to the funnel steps to start seeing analytics here."
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
