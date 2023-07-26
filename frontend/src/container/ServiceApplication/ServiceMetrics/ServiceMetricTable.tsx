import { ResizeTable } from 'components/ResizeTable';
import { useGetQueriesRange } from 'hooks/queryBuilder/useGetQueriesRange';
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
			console.error(error);
		},
	});

	const isLoading = queries.some((query) => query.isLoading);
	const isError = queries.some((query) => query.isError);
	const services: ServicesList[] = useMemo(
		() =>
			getServiceListFromQuery({
				queries,
				topLevelOperations,
				isLoading,
				isError,
			}),
		[isError, isLoading, queries, topLevelOperations],
	);

	const { search } = useLocation();
	const tableColumns = getColumns(search, true);

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
