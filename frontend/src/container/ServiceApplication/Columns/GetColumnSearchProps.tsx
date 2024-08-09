import '../ServiceApplication.styles.scss';

import { SearchOutlined } from '@ant-design/icons';
import { Popconfirm, PopconfirmProps } from 'antd';
import type { ColumnType } from 'antd/es/table';
import ROUTES from 'constants/routes';
import { routeConfig } from 'container/SideNav/config';
import { getQueryString } from 'container/SideNav/helper';
import history from 'lib/history';
import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ServicesList } from 'types/api/metrics/getService';

import { filterDropdown } from '../Filter/FilterDropdown';

const MAX_TOP_LEVEL_OPERATIONS = 2500;

const highTopLevelOperationsPopoverDesc = (metrics: string): JSX.Element => (
	<div className="popover-description">
		The service `{metrics}` has too many top level operations. It makes the
		dashboard slow to load.
	</div>
);

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
			return (
				record[dataIndex]
					?.toString()
					.toLowerCase()
					.includes(value.toString().toLowerCase()) || false
			);
		}

		return false;
	},
	render: (metrics: string, record: ServicesList): JSX.Element => {
		const urlParams = new URLSearchParams(search);
		const avialableParams = routeConfig[ROUTES.SERVICE_METRICS];
		const queryString = getQueryString(avialableParams, urlParams);
		const topLevelOperations = record?.dataWarning?.topLevelOps || [];

		const handleShowTopLevelOperations: PopconfirmProps['onConfirm'] = () => {
			history.push(
				`${ROUTES.APPLICATION}/${encodeURIComponent(metrics)}/top-level-operations`,
			);
		};

		const hasHighTopLevelOperations =
			topLevelOperations &&
			Array.isArray(topLevelOperations) &&
			topLevelOperations.length > MAX_TOP_LEVEL_OPERATIONS;

		return (
			<div className={`serviceName ${hasHighTopLevelOperations ? 'error' : ''} `}>
				{hasHighTopLevelOperations && (
					<Popconfirm
						title="Too Many Top Level Operations"
						description={highTopLevelOperationsPopoverDesc(metrics)}
						placement="right"
						overlayClassName="service-high-top-level-operations"
						onConfirm={handleShowTopLevelOperations}
						trigger={['hover']}
						showCancel={false}
						okText="Show Top Level Operations"
					>
						<Info size={14} />
					</Popconfirm>
				)}

				<Link
					to={`${ROUTES.APPLICATION}/${encodeURIComponent(
						metrics,
					)}?${queryString.join('')}`}
				>
					{metrics}
				</Link>
			</div>
		);
	},
});
