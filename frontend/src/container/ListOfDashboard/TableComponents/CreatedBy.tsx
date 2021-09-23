import { Typography } from 'antd';
import convertDateToAmAndPm from 'lib/convertDateToAmAndPm';
import React from 'react';

import { Data } from '..';

const Created = (createdBy: Data['createdBy']): JSX.Element => {
	const time = new Date(createdBy);

	return (
		<Typography>{`${time.toLocaleDateString()} ${convertDateToAmAndPm(
			time,
		)}`}</Typography>
	);
};

export default Created;
