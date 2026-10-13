import { Typography } from '@signozhq/ui/typography';
import { timeItems } from 'constants/timePreference';

export const menuItems = timeItems.map((item) => ({
	key: item.enum,
	label: <Typography>{item.name}</Typography>,
}));
