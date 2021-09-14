import { Typography } from 'antd';
import React from 'react';

import { Data } from '..';

const DateComponent = (
	lastUpdatedTime: Data['lastUpdatedTime'],
): JSX.Element => {
	const date = new Date(lastUpdatedTime).toDateString();

	return <Typography>{date}</Typography>;
};

export default DateComponent;
