import './FunnelResults.styles.scss';

import { FunnelData } from 'types/api/traceFunnels';

import EmptyFunnelResults from './EmptyFunnelResults';
import FunnelGraph from './FunnelGraph';
import OverallMetrics from './OverallMetrics';
import StepsTransitionResults from './StepsTransitionResults';

interface FunnelResultsProps {
	funnel: FunnelData;
	validTracesCount: number;
}

function FunnelResults({
	funnel,
	validTracesCount,
}: FunnelResultsProps): JSX.Element {
	console.log({ funnel });

	if (validTracesCount === 0) {
		return <EmptyFunnelResults />;
	}

	return (
		<div className="funnel-results">
			<OverallMetrics />
			<FunnelGraph />
			<StepsTransitionResults stepsCount={3} />
		</div>
	);
}

export default FunnelResults;
