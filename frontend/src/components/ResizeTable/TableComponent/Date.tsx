import { Typography } from 'antd';
import convertDateToAmAndPm from 'lib/convertDateToAmAndPm';
import getFormattedDate from 'lib/getFormatedDate';

function DateComponent(
	CreatedOrUpdateTime: string | number | Date,
): JSX.Element {
	const time = new Date(CreatedOrUpdateTime);

	const date = getFormattedDate(time);

	const timeString = `${date} ${convertDateToAmAndPm(time)}`;

	return <Typography>{timeString}</Typography>;
}

export default DateComponent;
