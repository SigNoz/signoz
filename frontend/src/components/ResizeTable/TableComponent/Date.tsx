import { Typography } from 'antd';
import convertDateToAmAndPm from 'lib/convertDateToAmAndPm';
import getFormattedDate from 'lib/getFormatedDate';

function DateComponent(
	CreatedOrUpdateTime: string | number | Date,
): JSX.Element {
	const time = new Date(CreatedOrUpdateTime);

	const date = getFormattedDate(time);

	const timeString = `${date} ${convertDateToAmAndPm(time)}`;

	if (CreatedOrUpdateTime === null) {
		return <Typography> - </Typography>;
	}

	return (
		<Typography className="DateComponent-container">{timeString}</Typography>
	);
}

export default DateComponent;
