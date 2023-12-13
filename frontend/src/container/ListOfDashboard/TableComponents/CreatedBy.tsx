import { Typography } from 'antd';
import convertDateToAmAndPm from 'lib/convertDateToAmAndPm';
import getFormattedDate from 'lib/getFormatedDate';

import { Data } from '../DashboardsList';

function Created(createdBy: Data['createdBy']): JSX.Element {
	const time = new Date(createdBy);

	const date = getFormattedDate(time);

	const timeString = `${date} ${convertDateToAmAndPm(time)}`;

	return <Typography>{`${timeString}`}</Typography>;
}

export default Created;
