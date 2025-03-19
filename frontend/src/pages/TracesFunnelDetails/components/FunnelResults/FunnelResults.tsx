import './FunnelResults.styles.scss';

import { FunnelData } from 'types/api/traceFunnels';

interface FunnelResultsProps {
	funnel: FunnelData;
}

function FunnelResults({ funnel }: FunnelResultsProps): JSX.Element {
	return (
		<div className="funnel-results">FunnelResults, {JSON.stringify(funnel)}</div>
	);
}

export default FunnelResults;
