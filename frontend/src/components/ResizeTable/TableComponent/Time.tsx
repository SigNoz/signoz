import { Typography } from 'antd';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { useTimezone } from 'providers/Timezone';

function Time({ CreatedOrUpdateTime }: DateProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const time = new Date(CreatedOrUpdateTime);
	const timeString = formatTimezoneAdjustedTimestamp(
		time,
		DATE_TIME_FORMATS.UTC_US,
	);
	return <Typography>{timeString}</Typography>;
}

type DateProps = {
	CreatedOrUpdateTime: string | number | Date;
};

export default Time;
