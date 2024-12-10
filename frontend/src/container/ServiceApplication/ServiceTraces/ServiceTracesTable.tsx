import { WarningFilled } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import { ResizeTable } from 'components/ResizeTable';
import { MAX_RPS_LIMIT } from 'constants/global';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import { useAppContext } from 'providers/App/App';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { isCloudUser } from 'utils/app';
import { getTotalRPS } from 'utils/services';

import { getColumns } from '../Columns/ServiceColumn';
import ServiceTableProps from '../types';

function ServiceTraceTable({
	services,
	loading,
}: ServiceTableProps): JSX.Element {
	const { search } = useLocation();
	const [RPS, setRPS] = useState(0);
	const { t: getText } = useTranslation(['services']);

	const { licenses, isFetchingLicenses } = useAppContext();
	const isCloudUserVal = isCloudUser();
	const tableColumns = useMemo(() => getColumns(search, false), [search]);

	useEffect(() => {
		if (
			!isFetchingLicenses &&
			licenses?.onTrial &&
			!licenses?.trialConvertedToSubscription &&
			isCloudUserVal
		) {
			if (services.length > 0) {
				const rps = getTotalRPS(services);
				setRPS(rps);
			} else {
				setRPS(0);
			}
		}
	}, [
		services,
		isCloudUserVal,
		isFetchingLicenses,
		licenses?.onTrial,
		licenses?.trialConvertedToSubscription,
	]);

	const paginationConfig = {
		defaultPageSize: 10,
		showTotal: (total: number, range: number[]): string =>
			`${range[0]}-${range[1]} of ${total} items`,
	};
	return (
		<>
			{RPS > MAX_RPS_LIMIT && (
				<Flex justify="left">
					<Typography.Title level={5} type="warning" style={{ marginTop: 0 }}>
						<WarningFilled /> {getText('rps_over_100')}
						<a href="mailto:cloud-support@signoz.io">email</a>
					</Typography.Title>
				</Flex>
			)}

			<ResourceAttributesFilter />

			<ResizeTable
				pagination={paginationConfig}
				columns={tableColumns}
				loading={loading}
				dataSource={services}
				rowKey="serviceName"
			/>
		</>
	);
}

export default ServiceTraceTable;
