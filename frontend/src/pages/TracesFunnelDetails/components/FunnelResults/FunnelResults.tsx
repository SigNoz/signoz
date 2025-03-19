import './FunnelResults.styles.scss';

import { FunnelData } from 'types/api/traceFunnels';

import FunnelGraph from './FunnelGraph';
import OverallMetrics from './OverallMetrics';
import StepsTransitionResults from './StepsTransitionResults';

interface FunnelResultsProps {
	funnel: FunnelData;
}

function FunnelResults({ funnel }: FunnelResultsProps): JSX.Element {
	console.log({ funnel });
	return (
		<div className="funnel-results">
			<OverallMetrics />
			<FunnelGraph />
			<StepsTransitionResults stepsCount={3} />
		</div>
	);
}

export default FunnelResults;
