import { useLocation } from 'react-router-dom';
import { Typography } from '@signozhq/ui/typography';

import { TableLabel } from '../types';

function TabLabel({ routeKey, label }: TableLabel): JSX.Element {
	const { pathname } = useLocation();

	if (pathname === routeKey) {
		return <Typography.Link>{label}</Typography.Link>;
	}

	return <Typography>{label}</Typography>;
}

export default TabLabel;
