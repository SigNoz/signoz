import { Typography } from '@signozhq/ui/typography';

import Time from './Time';

function DateComponent(
	CreatedOrUpdateTime: string | number | Date,
): JSX.Element {
	if (CreatedOrUpdateTime === null) {
		return (
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				{' '}
				-{' '}
			</Typography>
		);
	}

	return <Time CreatedOrUpdateTime={CreatedOrUpdateTime} />;
}

export default DateComponent;
