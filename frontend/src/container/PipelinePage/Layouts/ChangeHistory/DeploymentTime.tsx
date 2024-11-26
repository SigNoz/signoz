import { useTimezone } from 'providers/Timezone';

function DeploymentTime(deployTime: string): JSX.Element {
	const { formatTimestamp } = useTimezone();
	return (
		<span>{formatTimestamp(deployTime, 'MMMM DD, YYYY hh:mm A (UTC Z)')} </span>
	);
}

export default DeploymentTime;
