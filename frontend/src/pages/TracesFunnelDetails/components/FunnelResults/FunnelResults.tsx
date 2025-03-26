import './FunnelResults.styles.scss';

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
	const { steps } = useFunnelContext();
	if (steps.some((step) => step.service_name === '' || step.span_name === ''))
		return <EmptyFunnelResults />;
	return (
		<div className="funnel-results">
			<OverallMetrics />
			<FunnelGraph />
			<StepsTransitionResults funnelId={funnel.id} />
		</div>
	);
}

export default FunnelResults;
