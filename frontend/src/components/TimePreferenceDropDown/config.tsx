import { Typography } from '@signozhq/ui/typography';
import { timeItems } from 'constants/timePreference';

export const menuItems = timeItems.map((item) => ({
	value: item.enum,
	label: (
		<Typography
			variant="paragraph"
			size="base"
			weight="regular"
			color="inherit"
			as="span"
			textOverflow="wrap"
		>
			{item.name}
		</Typography>
	),
}));
