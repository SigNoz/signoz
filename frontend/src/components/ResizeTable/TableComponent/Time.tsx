import { Typography } from 'antd';
import { useTimezone } from 'providers/Timezone';

function Time({ CreatedOrUpdateTime }: DateProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const time = new Date(CreatedOrUpdateTime);
	const timeString = formatTimezoneAdjustedTimestamp(
		time,
		'MM/DD/YYYY hh:mm:ss A (UTC Z)',
	);
	return <Typography>{timeString}</Typography>;
}

type DateProps = {
	CreatedOrUpdateTime: string | number | Date;
};

export default Time;
