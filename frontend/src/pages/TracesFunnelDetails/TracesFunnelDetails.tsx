import { useFunnelDetails } from 'hooks/TracesFunnels/useFunnels';
import { useParams } from 'react-router-dom';

function TracesFunnelDetails(): JSX.Element {
	const { funnelId } = useParams<{ funnelId: string }>();
	const { data } = useFunnelDetails({ funnelId });
	return (
		<div style={{ color: 'var(--bg-vanilla-400)' }}>
			TracesFunnelDetails, {JSON.stringify(data)}
		</div>
	);
}

export default TracesFunnelDetails;
