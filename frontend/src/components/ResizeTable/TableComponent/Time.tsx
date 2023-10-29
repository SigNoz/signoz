import { Typography } from 'antd';
import convertDateToAmAndPm from 'lib/convertDateToAmAndPm';
import getFormattedDate from 'lib/getFormatedDate';

function Time({ CreatedOrUpdateTime }: DateProps): JSX.Element {
	const time = new Date(CreatedOrUpdateTime);
	const date = getFormattedDate(time);
	const timeString = `${date} ${convertDateToAmAndPm(time)}`;
	return <Typography>{timeString}</Typography>;
}

type DateProps = {
	CreatedOrUpdateTime: string | number | Date;
};

export default Time;
