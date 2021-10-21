import { Typography } from 'antd';
import convertDateToAmAndPm from 'lib/convertDateToAmAndPm';
import getFormattedDate from 'lib/getFormatedDate';
import React from 'react';

import { Data } from '..';

const Created = (createdBy: Data['createdBy']): JSX.Element => {
	const time = new Date(createdBy);

	const date = getFormattedDate(time);

	const timeString = `${date} ${convertDateToAmAndPm(time)}`;

	return <Typography>{`${timeString}`}</Typography>;
};

export default Created;
