import './FunnelResults.styles.scss';

import { FunnelData } from 'types/api/traceFunnels';

import EmptyFunnelResults from './EmptyFunnelResults';
import FunnelGraph from './FunnelGraph';
import OverallMetrics from './OverallMetrics';
import StepsTransitionResults from './StepsTransitionResults';

interface FunnelResultsProps {
	funnel: FunnelData;
	startTime: string;
	endTime: string;
}

function FunnelResults({
	funnel,
	startTime,
	endTime,
}: FunnelResultsProps): JSX.Element {
	if (!funnel?.steps?.length) return <EmptyFunnelResults />;
	return (
		<div className="funnel-results">
			<OverallMetrics />
			<FunnelGraph />
			<StepsTransitionResults
				funnelId={funnel.id}
				stepsCount={funnel.steps.length}
				startTime={startTime}
				endTime={endTime}
			/>
		</div>
	);
}

export default FunnelResults;
