import { Typography } from 'antd';
import { useTimezone } from 'providers/Timezone';

function Time({ CreatedOrUpdateTime }: DateProps): JSX.Element {
	const { formatTimestamp } = useTimezone();
	const time = new Date(CreatedOrUpdateTime);
	const timeString = formatTimestamp(time, 'MM/DD/YYYY hh:mm:ss A (UTC Z)');
	return <Typography>{timeString}</Typography>;
}

type DateProps = {
	CreatedOrUpdateTime: string | number | Date;
};

export default Time;
