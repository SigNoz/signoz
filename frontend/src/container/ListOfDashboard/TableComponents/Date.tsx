import { Typography } from 'antd';
import React from 'react';

import { Data } from '..';

const DateComponent = (
	lastUpdatedTime: Data['lastUpdatedTime'],
): JSX.Element => {
	const date = new Date(parseInt(lastUpdatedTime, 10)).toString();

	return <Typography>{date}</Typography>;
};

export default DateComponent;
