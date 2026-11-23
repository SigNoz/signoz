import { Typography } from '@signozhq/ui/typography';

import { TableLabel } from '../types';

function TabLabel({ label }: TableLabel): JSX.Element {
	return (
		<Typography
			variant="paragraph"
			size="base"
			weight="regular"
			color="inherit"
			as="span"
			textOverflow="wrap"
		>
			{label}
		</Typography>
	);
}

export default TabLabel;
