import { ResizeTable } from 'components/ResizeTable';
import { useGetQueriesRange } from 'hooks/queryBuilder/useGetQueriesRange';
import { useNotifications } from 'hooks/useNotifications';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { ServicesList } from 'types/api/metrics/getService';
import { GlobalReducer } from 'types/reducer/globalTime';

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

	const queries = useGetQueriesRange(queryRangeRequestData, {
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

	return (
		<ResizeTable
			columns={tableColumns}
			loading={isLoading}
			dataSource={services}
			rowKey="serviceName"
		/>
	);
}

export default ServiceMetricTable;
