import { SearchOutlined } from '@ant-design/icons';
import type { ColumnType } from 'antd/es/table';
import ROUTES from 'constants/routes';
import { routeConfig } from 'container/SideNav/config';
import { getQueryString } from 'container/SideNav/helper';
import { Link } from 'react-router-dom';
import { ServicesList } from 'types/api/metrics/getService';

import { filterDropdown } from '../Filter/FilterDropdown';
import { Name } from '../styles';

export const getColumnSearchProps = (
	dataIndex: keyof ServicesList,
	search: string,
): ColumnType<ServicesList> => ({
	filterDropdown,
	filterIcon: <SearchOutlined />,
	onFilter: (
		value: string | number | boolean,
		record: ServicesList,
	): boolean => {
		if (record[dataIndex]) {
			record[dataIndex]
				?.toString()
				.toLowerCase()
				.includes(value.toString().toLowerCase());
		}

		return false;
	},
	render: (metrics: string): JSX.Element => {
		const urlParams = new URLSearchParams(search);
		const avialableParams = routeConfig[ROUTES.SERVICE_METRICS];
		const queryString = getQueryString(avialableParams, urlParams);

		return (
			<Link to={`${ROUTES.APPLICATION}/${metrics}?${queryString.join('')}`}>
				<Name>{metrics}</Name>
			</Link>
		);
	},
});
