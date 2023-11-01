import { Typography } from 'antd';

import Time from './Time';

function DateComponent(
	CreatedOrUpdateTime: string | number | Date,
): JSX.Element {
	if (CreatedOrUpdateTime === null) {
		return <Typography> - </Typography>;
	}

	return <Time CreatedOrUpdateTime={CreatedOrUpdateTime} />;
}

export default DateComponent;
