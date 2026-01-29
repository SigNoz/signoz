import { useLocation } from 'react-router-dom';
import { Typography } from 'antd';

import { TableLabel } from '../types';

function TabLabel({ routeKey, label }: TableLabel): JSX.Element {
	const { pathname } = useLocation();

	if (pathname === routeKey) {
		return <Typography.Link>{label}</Typography.Link>;
	}

	return <Typography>{label}</Typography>;
}

export default TabLabel;
