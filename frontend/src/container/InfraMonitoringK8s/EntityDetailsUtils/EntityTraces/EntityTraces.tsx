import './entityTraces.styles.scss';

import { getListColumns } from 'components/HostMetricsDetail/HostMetricTraces/utils';
import { ResizeTable } from 'components/ResizeTable';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { QueryParams } from 'constants/query';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import NoLogs from 'container/NoLogs/NoLogs';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import { ErrorText } from 'container/TimeSeriesView/styles';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import TraceExplorerControls from 'container/TracesExplorer/Controls';
import { PER_PAGE_OPTIONS } from 'container/TracesExplorer/ListView/configs';
import { TracesLoading } from 'container/TracesExplorer/TraceLoading/TraceLoading';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination } from 'hooks/queryPagination';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import {
	filterOutPrimaryFilters,
	getEntityTracesQueryPayload,
	selectedEntityTracesColumns,
} from '../utils';

interface Props {
	timeRange: {
		startTime: number;
		endTime: number;
	};
	isModalTimeSelection: boolean;
	handleTimeChange: (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	) => void;
	handleChangeTracesFilters: (value: IBuilderQuery['filters']) => void;
	tracesFilters: IBuilderQuery['filters'];
	selectedInterval: Time;
	queryKey: string;
	queryKeyFilters: string[];
}

function EntityTraces({
	timeRange,
	isModalTimeSelection,
	handleTimeChange,
	handleChangeTracesFilters,
	tracesFilters,
	selectedInterval,
	queryKey,
	queryKeyFilters,
}: Props): JSX.Element {
	const [traces, setTraces] = useState<any[]>([]);
	const [offset] = useState<number>(0);

	const { currentQuery } = useQueryBuilder();
	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						dataSource: DataSource.TRACES,
						aggregateOperator: 'noop',
						aggregateAttribute: {
							...currentQuery.builder.queryData[0].aggregateAttribute,
						},
						filters: {
							items: filterOutPrimaryFilters(tracesFilters.items, queryKeyFilters),
							op: 'AND',
						},
					},
				],
			},
		}),
		[currentQuery, queryKeyFilters, tracesFilters.items],
	);

	const query = updatedCurrentQuery?.builder?.queryData[0] || null;

	const { queryData: paginationQueryData } = useUrlQueryData<Pagination>(
		QueryParams.pagination,
	);

	const queryPayload = useMemo(
		() =>
			getEntityTracesQueryPayload(
				timeRange.startTime,
				timeRange.endTime,
				paginationQueryData?.offset || offset,
				tracesFilters,
			),
		[
			timeRange.startTime,
			timeRange.endTime,
			offset,
			tracesFilters,
			paginationQueryData,
		],
	);

	const { data, isLoading, isFetching, isError } = useQuery({
		queryKey: [
			queryKey,
			timeRange.startTime,
			timeRange.endTime,
			offset,
			tracesFilters,
			DEFAULT_ENTITY_VERSION,
			paginationQueryData,
		],
		queryFn: () => GetMetricQueryRange(queryPayload, DEFAULT_ENTITY_VERSION),
		enabled: !!queryPayload,
	});

	const traceListColumns = getListColumns(selectedEntityTracesColumns);

	useEffect(() => {
		if (data?.payload?.data?.newResult?.data?.result) {
			const currentData = data.payload.data.newResult.data.result;
			if (currentData.length > 0 && currentData[0].list) {
				if (offset === 0) {
					setTraces(currentData[0].list ?? []);
				} else {
					setTraces((prev) => [...prev, ...(currentData[0].list ?? [])]);
				}
			}
		}
	}, [data, offset]);

	const isDataEmpty =
		!isLoading && !isFetching && !isError && traces.length === 0;
	const hasAdditionalFilters = tracesFilters.items.length > 1;

	const totalCount =
		data?.payload?.data?.newResult?.data?.result?.[0]?.list?.length || 0;

	return (
		<div className="entity-metric-traces">
			<div className="entity-metric-traces-header">
				<div className="filter-section">
					{query && (
						<QueryBuilderSearch
							query={query}
							onChange={handleChangeTracesFilters}
							disableNavigationShortcuts
						/>
					)}
				</div>
				<div className="datetime-section">
					<DateTimeSelectionV2
						showAutoRefresh={false}
						showRefreshText={false}
						hideShareModal
						isModalTimeSelection={isModalTimeSelection}
						onTimeChange={handleTimeChange}
						defaultRelativeTime="5m"
						modalSelectedInterval={selectedInterval}
					/>
				</div>
			</div>

			{isError && <ErrorText>{data?.error || 'Something went wrong'}</ErrorText>}

			{isLoading && traces.length === 0 && <TracesLoading />}

			{isDataEmpty && !hasAdditionalFilters && (
				<NoLogs dataSource={DataSource.TRACES} />
			)}

			{isDataEmpty && hasAdditionalFilters && (
				<EmptyLogsSearch dataSource={DataSource.TRACES} panelType="LIST" />
			)}

			{!isError && traces.length > 0 && (
				<div className="entity-traces-table">
					<TraceExplorerControls
						isLoading={isFetching}
						totalCount={totalCount}
						perPageOptions={PER_PAGE_OPTIONS}
						showSizeChanger={false}
					/>
					<ResizeTable
						tableLayout="fixed"
						pagination={false}
						scroll={{ x: true }}
						loading={isFetching}
						dataSource={traces}
						columns={traceListColumns}
					/>
				</div>
			)}
		</div>
	);
}

export default EntityTraces;
