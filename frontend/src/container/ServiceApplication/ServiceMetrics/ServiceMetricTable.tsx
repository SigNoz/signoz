import { WarningFilled } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import { ResizeTable } from 'components/ResizeTable';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { MAX_RPS_LIMIT } from 'constants/global';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import { useGetQueriesRange } from 'hooks/queryBuilder/useGetQueriesRange';
import { useNotifications } from 'hooks/useNotifications';
import { useAppContext } from 'providers/App/App';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { ServicesList } from 'types/api/metrics/getService';
import { GlobalReducer } from 'types/reducer/globalTime';
import { isCloudUser } from 'utils/app';
import { getTotalRPS } from 'utils/services';

import { getColumns } from '../Columns/ServiceColumn';
import { ServiceMetricsTableProps } from '../types';
import { getServiceListFromQuery } from '../utils';

function ServiceMetricTable({
	topLevelOperations,
	queryRangeRequestData,
}: ServiceMetricsTableProps): JSX.Element {
	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { notifications } = useNotifications();
	const { t: getText } = useTranslation(['services']);

	const { licenses, isFetchingLicenses } = useAppContext();
	const isCloudUserVal = isCloudUser();

	const queries = useGetQueriesRange(queryRangeRequestData, ENTITY_VERSION_V4, {
		queryKey: [
			`GetMetricsQueryRange-${queryRangeRequestData[0].selectedTime}-${globalSelectedInterval}`,
			maxTime,
			minTime,
			globalSelectedInterval,
		],
		keepPreviousData: true,
		enabled: true,
		refetchOnMount: false,
		onError: (error) => {
			notifications.error({
				message: error.message,
			});
		},
	});

	const isLoading = queries.some((query) => query.isLoading);
	const services: ServicesList[] = useMemo(
		() =>
			getServiceListFromQuery({
				queries,
				topLevelOperations,
				isLoading,
			}),
		[isLoading, queries, topLevelOperations],
	);

	const { search } = useLocation();
	const tableColumns = useMemo(() => getColumns(search, true), [search]);
	const [RPS, setRPS] = useState(0);

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
				loading={isLoading}
				dataSource={services}
				rowKey="serviceName"
			/>
		</>
	);
}

export default ServiceMetricTable;
