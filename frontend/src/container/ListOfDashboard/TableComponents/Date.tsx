import { Typography } from 'antd';
import convertDateToAmAndPm from 'lib/convertDateToAmAndPm';
import getFormattedDate from 'lib/getFormatedDate';

import { Data } from '..';

function DateComponent(lastUpdatedTime: Data['lastUpdatedTime']): JSX.Element {
	const time = new Date(lastUpdatedTime);

	const date = getFormattedDate(time);

	const timeString = `${date} ${convertDateToAmAndPm(time)}`;

	return <Typography>{timeString}</Typography>;
}

export default DateComponent;
