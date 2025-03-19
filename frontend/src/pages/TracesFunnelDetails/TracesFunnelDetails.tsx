import './TracesFunnelDetails.styles.scss';

import { useFunnelDetails } from 'hooks/TracesFunnels/useFunnels';
import { useParams } from 'react-router-dom';

import FunnelConfiguration from './components/FunnelConfiguration/FunnelConfiguration';
import FunnelResults from './components/FunnelResults/FunnelResults';

function TracesFunnelDetails(): JSX.Element {
	const { funnelId } = useParams<{ funnelId: string }>();
	const { data, isLoading, isError } = useFunnelDetails({ funnelId });

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (isError || !data?.payload) {
		return <div>Error loading funnel details</div>;
	}

	return (
		<div className="traces-funnel-details">
			<div className="traces-funnel-details__steps-config">
				<FunnelConfiguration funnel={data.payload} />
			</div>
			<div className="traces-funnel-details__steps-results">
				<FunnelResults funnel={data.payload} />
			</div>
		</div>
	);
}

export default TracesFunnelDetails;
