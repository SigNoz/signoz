import { useFunnelDetails } from 'hooks/TracesFunnels/useFunnels';
import { useParams } from 'react-router-dom-v5-compat';

function TracesFunnelDetails(): JSX.Element {
	// Temp: Hard type casting for string | undefined
	const { funnelId } = (useParams() as unknown) as { funnelId: string };
	const { data } = useFunnelDetails({ funnelId });
	return (
		<div style={{ color: 'var(--bg-vanilla-400)' }}>
			TracesFunnelDetails, {JSON.stringify(data)}
		</div>
	);
}

export default TracesFunnelDetails;
