import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { useTimezone } from 'providers/Timezone';

function DeploymentTime(deployTime: string): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	return (
		<span>
			{formatTimezoneAdjustedTimestamp(
				deployTime,
				DATE_TIME_FORMATS.UTC_MONTH_FULL,
			)}{' '}
		</span>
	);
}

export default DeploymentTime;
