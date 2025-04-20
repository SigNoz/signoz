import { Typography } from 'antd';
import { useLocation } from 'react-router-dom-v5-compat';

import { TableLabel } from '../types';

function TabLabel({ routeKey, label }: TableLabel): JSX.Element {
	const { pathname } = useLocation();

	if (pathname === routeKey) return <Typography.Link>{label}</Typography.Link>;

	return <Typography>{label}</Typography>;
}

export default TabLabel;
