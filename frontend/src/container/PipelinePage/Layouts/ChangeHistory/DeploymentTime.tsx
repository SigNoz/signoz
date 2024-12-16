import { useTimezone } from 'providers/Timezone';

function DeploymentTime(deployTime: string): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	return (
		<span>
			{formatTimezoneAdjustedTimestamp(
				deployTime,
				'MMMM DD, YYYY hh:mm A (UTC Z)',
			)}{' '}
		</span>
	);
}

export default DeploymentTime;
