import { Typography } from '@signozhq/ui/typography';

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
