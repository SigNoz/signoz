import { Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import ListViewOrderBy from 'components/OrderBy/ListViewOrderBy';
import { ResizeTable } from 'components/ResizeTable';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import NoLogs from 'container/NoLogs/NoLogs';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination } from 'hooks/queryPagination';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { ArrowUp10, Minus } from 'lucide-react';
import {
	Dispatch,
	memo,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import APIError from 'types/api/error';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import DOCLINKS from 'utils/docLinks';
import { transformBuilderQueryFields } from 'utils/queryTransformers';

import TraceExplorerControls from '../Controls';
import { TracesLoading } from '../TraceLoading/TraceLoading';
import { columns, PER_PAGE_OPTIONS } from './configs';
import { ActionsContainer, Container } from './styles';

interface TracesViewProps {
	isFilterApplied: boolean;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	setIsLoadingQueries: Dispatch<SetStateAction<boolean>>;
}

function TracesView({
	isFilterApplied,
	setWarning,
	setIsLoadingQueries,
}: TracesViewProps): JSX.Element {
	const { stagedQuery, panelType } = useQueryBuilder();
	const [orderBy, setOrderBy] = useState<string>('timestamp:desc');

	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { queryData: paginationQueryData } = useUrlQueryData<Pagination>(
		QueryParams.pagination,
	);

	const transformedQuery = useMemo(
		() =>
			transformBuilderQueryFields(stagedQuery || initialQueriesMap.traces, {
				orderBy: [
					{
						columnName: orderBy.split(':')[0],
						order: orderBy.split(':')[1] as 'asc' | 'desc',
					},
				],
			}),
		[stagedQuery, orderBy],
	);

	const handleOrderChange = useCallback((value: string) => {
		setOrderBy(value);
	}, []);

	const { data, isLoading, isFetching, isError, error } = useGetQueryRange(
		{
			query: transformedQuery,
			graphType: panelType || PANEL_TYPES.TRACE,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource: 'traces',
			},
			tableParams: {
				pagination: paginationQueryData,
			},
		},
		ENTITY_VERSION_V5,
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				globalSelectedTime,
				maxTime,
				minTime,
				stagedQuery,
				panelType,
				paginationQueryData,
				orderBy,
			],
			enabled: !!stagedQuery && panelType === PANEL_TYPES.TRACE,
		},
	);

	useEffect(() => {
		if (data?.payload) {
			setWarning(data?.warning);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.payload, data?.warning]);

	const responseData = data?.payload?.data?.newResult?.data?.result[0]?.list;
	const tableData = useMemo(
		() => responseData?.map((listItem) => listItem.data),
		[responseData],
	);

	useEffect(() => {
		if (isLoading || isFetching) {
			setIsLoadingQueries(true);
		} else {
			setIsLoadingQueries(false);
		}
	}, [isLoading, isFetching, setIsLoadingQueries]);

	useEffect(() => {
		if (!isLoading && !isFetching && !isError && (tableData || []).length !== 0) {
			logEvent('Traces Explorer: Data present', {
				panelType: 'TRACE',
			});
		}
	}, [isLoading, isFetching, isError, panelType, tableData]);

	return (
		<Container>
			{(tableData || []).length !== 0 && (
				<ActionsContainer>
					<Typography>
						This tab only shows Root Spans. More details
						<Typography.Link href={DOCLINKS.TRACES_DETAILS_LINK} target="_blank">
							{' '}
							here
						</Typography.Link>
					</Typography>

					<div className="trace-explorer-controls">
						<div className="order-by-container">
							<div className="order-by-label">
								Order by <Minus size={14} /> <ArrowUp10 size={14} />
							</div>

							<ListViewOrderBy
								value={orderBy}
								onChange={handleOrderChange}
								dataSource={DataSource.TRACES}
							/>
						</div>

						<TraceExplorerControls
							isLoading={isLoading}
							totalCount={responseData?.length || 0}
							perPageOptions={PER_PAGE_OPTIONS}
						/>
					</div>
				</ActionsContainer>
			)}

			{isError && error && <ErrorInPlace error={error as APIError} />}

			{(isLoading || (isFetching && (tableData || []).length === 0)) && (
				<TracesLoading />
			)}

			{!isLoading &&
				!isFetching &&
				!isError &&
				!isFilterApplied &&
				(tableData || []).length === 0 && <NoLogs dataSource={DataSource.TRACES} />}

			{!isLoading &&
				!isFetching &&
				(tableData || []).length === 0 &&
				!isError &&
				isFilterApplied && (
					<EmptyLogsSearch dataSource={DataSource.TRACES} panelType="TRACE" />
				)}

			{(tableData || []).length !== 0 && (
				<ResizeTable
					loading={isLoading}
					columns={columns}
					tableLayout="fixed"
					dataSource={tableData}
					scroll={{ x: true }}
					pagination={false}
				/>
			)}
		</Container>
	);
}

export default memo(TracesView);
