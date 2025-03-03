import './Summary.styles.scss';

import * as Sentry from '@sentry/react';
import { usePageSize } from 'container/InfraMonitoringK8s/utils';
import { useGetMetricsList } from 'hooks/metricsExplorer/useGetMetricsList';
import { useGetMetricsTreeMap } from 'hooks/metricsExplorer/useGetMetricsTreeMap';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import MetricsSearch from './MetricsSearch';
import MetricsTable from './MetricsTable';
import MetricsTreemap from './MetricsTreemap';
import { OrderByPayload, TreemapViewType } from './types';
import {
	convertNanoSecondsToISOString,
	formatDataForMetricsTable,
	getMetricsListQuery,
} from './utils';

function Summary(): JSX.Element {
	const { pageSize, setPageSize } = usePageSize('metricsExplorer');
	const [currentPage, setCurrentPage] = useState(1);
	const [orderBy, setOrderBy] = useState<OrderByPayload>({
		columnName: 'type',
		order: 'asc',
	});
	const [heatmapView, setHeatmapView] = useState<TreemapViewType>('cardinality');

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { currentQuery } = useQueryBuilder();
	const queryFilters = useMemo(
		() =>
			currentQuery?.builder?.queryData[0]?.filters || {
				items: [],
				op: 'and',
			},
		[currentQuery?.builder?.queryData],
	);

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	const metricsListQuery = useMemo(() => {
		const baseQuery = getMetricsListQuery();
		return {
			...baseQuery,
			limit: pageSize,
			offset: (currentPage - 1) * pageSize,
			filters: queryFilters,
			startDate: convertNanoSecondsToISOString(minTime),
			endDate: convertNanoSecondsToISOString(maxTime),
			orderBy,
		};
	}, [pageSize, currentPage, queryFilters, minTime, maxTime, orderBy]);

	const metricsTreemapQuery = useMemo(
		() => ({
			limit: 100,
			filters: queryFilters,
			heatmap: heatmapView,
		}),
		[queryFilters, heatmapView],
	);

	const {
		data: metricsData,
		isLoading: isMetricsLoading,
		isFetching: isMetricsFetching,
	} = useGetMetricsList(metricsListQuery, {
		enabled: !!metricsListQuery,
	});

	const {
		data: treeMapData,
		isLoading: isTreeMapLoading,
		isFetching: isTreeMapFetching,
	} = useGetMetricsTreeMap(metricsTreemapQuery, {
		enabled: !!metricsTreemapQuery,
	});

	const handleFilterChange = useCallback(
		(value: TagFilter) => {
			handleChangeQueryData('filters', value);
			setCurrentPage(1);
		},
		[handleChangeQueryData],
	);

	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						aggregateOperator: 'noop',
						aggregateAttribute: {
							...currentQuery.builder.queryData[0].aggregateAttribute,
						},
					},
				],
			},
		}),
		[currentQuery],
	);

	const searchQuery = updatedCurrentQuery?.builder?.queryData[0] || null;

	const onPaginationChange = (page: number, pageSize: number): void => {
		setCurrentPage(page);
		setPageSize(pageSize);
	};

	const formattedMetricsData = useMemo(
		() => formatDataForMetricsTable(metricsData?.payload?.data?.metrics || []),
		[metricsData],
	);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="metrics-explorer-summary-tab">
				<MetricsSearch
					query={searchQuery}
					onChange={handleFilterChange}
					heatmapView={heatmapView}
					setHeatmapView={setHeatmapView}
				/>
				<MetricsTreemap
					data={treeMapData?.payload}
					isLoading={isTreeMapLoading || isTreeMapFetching}
					viewType={heatmapView}
				/>
				<MetricsTable
					isLoading={isMetricsLoading || isMetricsFetching}
					data={formattedMetricsData}
					pageSize={pageSize}
					currentPage={currentPage}
					onPaginationChange={onPaginationChange}
					setOrderBy={setOrderBy}
				/>
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default Summary;
