/* eslint-disable sonarjs/cognitive-complexity */
import {
	Dispatch,
	memo,
	MutableRefObject,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import DownloadOptionsMenu from 'components/DownloadOptionsMenu/DownloadOptionsMenu';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import ListViewOrderBy from 'components/OrderBy/ListViewOrderBy';
import { ResizeTable } from 'components/ResizeTable';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import NoLogs from 'container/NoLogs/NoLogs';
import { getListViewQuery } from 'container/TracesExplorer/explorerUtils';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination } from 'hooks/queryPagination';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import APIError from 'types/api/error';
import { QueryKeyRequestProps } from 'types/api/querySuggestions/types';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import DOCLINKS from 'utils/docLinks';

import TraceExplorerControls from '../Controls';
import { TracesLoading } from '../TraceLoading/TraceLoading';
import {
	AI_QUERY_TYPE,
	BASE_TRACE_VIEW_COLUMNS,
	buildTraceViewColumns,
	DEFAULT_TRACE_VIEW_ORDER_BY,
	PER_PAGE_OPTIONS,
	TRACE_VIEW_ORDER_BY_FIELD_CONTEXT,
} from './configs';
import { ActionsContainer, Container } from './styles';
import useTraceViewColumns, {
	TraceViewColumnSelection,
} from './useTraceViewColumns';

interface TracesViewProps {
	isFilterApplied: boolean;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	setIsLoadingQueries: Dispatch<SetStateAction<boolean>>;
	queryKeyRef?: MutableRefObject<any>;
	/**
	 * Opt in to user-editable columns. Omit for the base root-span columns with
	 * no Options → Edit columns picker.
	 */
	columnSelection?: TraceViewColumnSelection;
	/**
	 * Query type these rows come from. `builder_ai_query` turns on Order by,
	 * scoped to trace-level aggregates — the sort key and field context are Trace
	 * View defaults for now. Omit and no `order` is sent at all, as today.
	 *
	 * Order-by state is per-view on purpose: List View sorts spans by `timestamp`,
	 * which is not a valid sort over traces, so sharing one value across views
	 * would push an unexecutable sort through a view switch.
	 */
	queryType?: string;
}

function TracesView({
	isFilterApplied,
	setWarning,
	setIsLoadingQueries,
	queryKeyRef,
	columnSelection,
	queryType,
}: TracesViewProps): JSX.Element {
	const { stagedQuery, panelType } = useQueryBuilder();

	const {
		selectedTime: globalSelectedTime,
		maxTime,
		minTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	const { queryData: paginationQueryData } = useUrlQueryData<Pagination>(
		QueryParams.pagination,
	);

	// Column visibility is owned here rather than by useOptionsMenu, whose
	// TRACES_LIST_OPTIONS storage is already claimed by List View.
	const { visibleColumns, selectedFields, availableFields, onFieldsChange } =
		useTraceViewColumns(columnSelection);

	const fieldsSelectorConfig = useMemo(
		() =>
			columnSelection
				? {
						fieldsSelector: {
							value: selectedFields,
							onFieldsChange,
						},
					}
				: null,
		[columnSelection, selectedFields, onFieldsChange],
	);

	const tableColumns = useMemo(
		() =>
			buildTraceViewColumns(
				columnSelection ? visibleColumns : BASE_TRACE_VIEW_COLUMNS,
			),
		[columnSelection, visibleColumns],
	);

	// Only the AI query exposes sortable trace-level aggregates, so it alone gets
	// an Order by control.
	const isOrderByEnabled = queryType === AI_QUERY_TYPE;

	const [orderBy, setOrderBy] = useState<string>(() =>
		isOrderByEnabled ? DEFAULT_TRACE_VIEW_ORDER_BY : '',
	);

	// Seed the dropdown from the same key we start sorted by, so its first option
	// is always the sort currently applied.
	const orderBySeedKey = DEFAULT_TRACE_VIEW_ORDER_BY.split(':')[0];

	const handleOrderChange = useCallback((value: string): void => {
		setOrderBy(value);
	}, []);

	const transformedQuery = useMemo(
		// Empty means "no sort" — passing '' would shape an order on a blank column.
		() =>
			getListViewQuery(
				stagedQuery || initialQueriesMap.traces,
				orderBy || undefined,
			),
		[stagedQuery, orderBy],
	);

	const queryKey = useMemo(
		() => [
			REACT_QUERY_KEY.GET_QUERY_RANGE,
			globalSelectedTime,
			maxTime,
			minTime,
			stagedQuery,
			panelType,
			paginationQueryData,
			// `orderBy` belongs here — unlike column visibility, it changes the
			// request and must refetch. Column visibility is deliberately absent:
			// it is client-side only, and this array doubles as the parent's
			// cancelQueries handle.
			orderBy,
		],
		[
			globalSelectedTime,
			maxTime,
			minTime,
			stagedQuery,
			panelType,
			paginationQueryData,
			orderBy,
		],
	);

	if (queryKeyRef) {
		queryKeyRef.current = queryKey;
	}

	const { data, isLoading, isFetching, isError, error } = useGetQueryRange(
		{
			query: transformedQuery,
			graphType: panelType || PANEL_TYPES.TRACE,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource: 'traces',
			},
			// No selectColumns: the backend returns all columns and visibility is
			// resolved client-side, so toggling a column is refetch-free.
			tableParams: {
				pagination: paginationQueryData,
			},
		},
		ENTITY_VERSION_V5,
		{
			queryKey,
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
						{isOrderByEnabled && (
							<ListViewOrderBy
								value={orderBy}
								onChange={handleOrderChange}
								dataSource={DataSource.TRACES}
								fieldContext={TRACE_VIEW_ORDER_BY_FIELD_CONTEXT}
								seedKey={orderBySeedKey}
								queryType={queryType}
							/>
						)}

						<DownloadOptionsMenu
							dataSource={DataSource.TRACES}
							panelType={PANEL_TYPES.TRACE}
						/>

						<TraceExplorerControls
							isLoading={isLoading}
							totalCount={responseData?.length || 0}
							perPageOptions={PER_PAGE_OPTIONS}
							config={fieldsSelectorConfig}
							availableFields={columnSelection ? availableFields : undefined}
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
					columns={tableColumns}
					tableLayout="fixed"
					dataSource={tableData}
					scroll={{ x: true }}
					pagination={false}
				/>
			)}
		</Container>
	);
}

TracesView.defaultProps = {
	queryKeyRef: undefined,
	columnSelection: undefined,
	queryType: undefined,
};

export default memo(TracesView);
