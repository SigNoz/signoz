import './HostMetricTraces.styles.scss';

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
import GetMinMax from 'lib/getMinMax';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { columns, getHostTracesQueryPayload } from './constants';

interface Props {
	hostName: string;
	timeRange: {
		startTime: number;
		endTime: number;
	};
	isModalTimeSelection: boolean;
}

function HostMetricTraces({
	hostName,
	timeRange,
	isModalTimeSelection,
}: Props): JSX.Element {
	const [traces, setTraces] = useState<any[]>([]);
	const [offset] = useState<number>(0);
	const [modalTimeRange, setModalTimeRange] = useState(timeRange);
	const [, setSelectedInterval] = useState<Time>('5m');

	const [filters, setFilters] = useState<IBuilderQuery['filters']>(() => ({
		op: 'AND',
		items: [
			{
				id: 'host-filter-id', // Static ID since this is a permanent filter
				key: {
					key: 'host.name',
					dataType: DataTypes.String,
					type: 'resource',
					isColumn: false,
					isJSON: false,
					id: 'host.name--string--resource--false',
				},
				op: '=',
				value: hostName,
			},
		],
	}));

	// const { config } = useOptionsMenu({
	//     storageKey: LOCALSTORAGE.TRACES_LIST_OPTIONS,
	//     dataSource: DataSource.TRACES,
	//     aggregateOperator: 'count',
	//     initialOptions: {
	//         selectColumns: defaultSelectedColumns,
	//     },
	// });

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
					},
				],
			},
		}),
		[currentQuery],
	);

	const query = updatedCurrentQuery?.builder?.queryData[0] || null;

	const handleChangeTagFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			setFilters((prevFilters) => ({
				op: 'AND',
				items: [...prevFilters.items, ...value.items],
			}));
		},
		[], // hostName can be removed from deps since we're using prevFilters
	);

	const handleTimeChange = useCallback(
		(interval: Time | CustomTimeType, dateTimeRange?: [number, number]): void => {
			setSelectedInterval(interval as Time);
			if (interval === 'custom' && dateTimeRange) {
				setModalTimeRange({
					startTime: Math.floor(dateTimeRange[0] / 1000),
					endTime: Math.floor(dateTimeRange[1] / 1000),
				});
			} else {
				const { maxTime, minTime } = GetMinMax(interval);
				setModalTimeRange({
					startTime: Math.floor(minTime / 1000000),
					endTime: Math.floor(maxTime / 1000000),
				});
			}
		},
		[],
	);

	const { queryData: paginationQueryData } = useUrlQueryData<Pagination>(
		QueryParams.pagination,
	);

	const queryPayload = useMemo(
		() =>
			getHostTracesQueryPayload(
				modalTimeRange.startTime,
				modalTimeRange.endTime,
				paginationQueryData?.offset || offset,
				filters,
			),
		[
			modalTimeRange.startTime,
			modalTimeRange.endTime,
			offset,
			filters,
			paginationQueryData,
		],
	);

	const { data, isLoading, isFetching, isError } = useQuery({
		queryKey: [
			'hostMetricTraces',
			modalTimeRange.startTime,
			modalTimeRange.endTime,
			offset,
			filters,
			DEFAULT_ENTITY_VERSION,
			paginationQueryData,
		],
		queryFn: () => GetMetricQueryRange(queryPayload, DEFAULT_ENTITY_VERSION),
		enabled: !!queryPayload,
	});

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
	const hasAdditionalFilters = filters.items.length > 1;

	const totalCount =
		data?.payload?.data?.newResult?.data?.result?.[0]?.list?.length || 0;

	return (
		<div className="host-metric-traces">
			<div className="host-metric-traces-header">
				<div className="filter-section">
					{query && (
						<QueryBuilderSearch query={query} onChange={handleChangeTagFilters} />
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
				<>
					<TraceExplorerControls
						isLoading={isFetching}
						totalCount={totalCount}
						perPageOptions={PER_PAGE_OPTIONS}
					/>
					<ResizeTable
						tableLayout="fixed"
						pagination={false}
						scroll={{ x: true }}
						loading={isFetching}
						dataSource={traces}
						columns={columns}
					/>
				</>
			)}
		</div>
	);
}

export default HostMetricTraces;
