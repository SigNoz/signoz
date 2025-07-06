import { WarningFilled } from '@ant-design/icons';
import { DataTable } from '@signozhq/table';
import { Flex, Typography } from 'antd';
import { MAX_RPS_LIMIT } from 'constants/global';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import { getTableColumns } from 'container/ServiceTable/Columns/ServiceColumn';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useAppContext } from 'providers/App/App';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { getTotalRPS } from 'utils/services';

import ServiceTableProps from '../types';

function ServiceTraceTable({
	services,
	loading,
}: ServiceTableProps): JSX.Element {
	const { search } = useLocation();
	const [RPS, setRPS] = useState(0);
	const { t: getText } = useTranslation(['services']);

	const { isFetchingActiveLicense, trialInfo } = useAppContext();
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();
	const tableColumns = useMemo(() => getTableColumns(search), [search]);

	useEffect(() => {
		if (
			!isFetchingActiveLicense &&
			trialInfo?.onTrial &&
			!trialInfo?.trialConvertedToSubscription &&
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
		isFetchingActiveLicense,
		trialInfo?.onTrial,
		trialInfo?.trialConvertedToSubscription,
	]);

	const paginationConfig = {
		defaultPageSize: 10,
		showTotal: (total: number, range: number[]): string =>
			`${range[0]}-${range[1]} of ${total} items`,
	};
	return (
		<div className="service-traces-table-container">
			{RPS > MAX_RPS_LIMIT && (
				<Flex justify="left">
					<Typography.Title level={5} type="warning" style={{ marginTop: 0 }}>
						<WarningFilled /> {getText('rps_over_100')}
						<a href="mailto:cloud-support@signoz.io">email</a>
					</Typography.Title>
				</Flex>
			)}

			<ResourceAttributesFilter />

			<DataTable
				columns={tableColumns}
				data={services}
				tableId="service-traces-table"
				isLoading={loading}
				enablePagination
				pageSize={paginationConfig.defaultPageSize}
				showHeaders
				enableSorting
				enableColumnResizing={false}
				enableColumnReordering={false}
				enableColumnPinning={false}
				enableGlobalFilter={false}
			/>
		</div>
	);
}

export default ServiceTraceTable;
