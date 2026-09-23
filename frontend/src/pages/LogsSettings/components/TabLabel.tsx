import { Typography } from '@signozhq/ui/typography';
import { useAppLocation } from 'lib/router/useAppLocation';

import { TableLabel } from '../types';

function TabLabel({ routeKey, label }: TableLabel): JSX.Element {
	const { pathname } = useAppLocation();

	if (pathname === routeKey) {
		return <Typography.Link>{label}</Typography.Link>;
	}

	return <Typography>{label}</Typography>;
}

export default TabLabel;
