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
import { QueryKey } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import logEvent from 'api/common/logEvent';
import DownloadOptionsMenu from 'components/DownloadOptionsMenu/DownloadOptionsMenu';
import ListViewOrderBy from 'components/OrderBy/ListViewOrderBy';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import { initialQueryAIWithType, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useOptionsMenu } from 'container/OptionsMenu';
import { CustomTimeType } from 'container/TopNav/DateTimeSelectionV2/types';
import TraceExplorerControls from 'container/TracesExplorer/Controls';
import { getListViewQuery } from 'container/TracesExplorer/explorerUtils';
import {
	getTraceLink,
	transformSpanRows,
} from 'container/TracesExplorer/ListView/utils';
import {
	getFieldColumn,
	TracesTableRow,
} from 'container/TracesExplorer/TracesTable/getFieldColumn';
import TracesTable from 'container/TracesExplorer/TracesTable/TracesTable';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination } from 'hooks/queryPagination';
import { getDefaultPaginationConfig } from 'hooks/queryPagination/utils';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { ArrowUp10, Minus } from '@signozhq/icons';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	defaultSelectedColumns,
	PER_PAGE_OPTIONS,
	TIMESTAMP_FIELD,
} from './configs';
import './ListView.styles.scss';

import styles from './ListView.module.scss';

interface ListViewProps {
	isFilterApplied: boolean;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	setIsLoadingQueries: Dispatch<SetStateAction<boolean>>;
	queryKeyRef?: MutableRefObject<QueryKey | undefined>;
}

function ListView({
	isFilterApplied,
	setWarning,
	setIsLoadingQueries,
	queryKeyRef,
}: ListViewProps): JSX.Element {
	const { stagedQuery, panelType: panelTypeFromQueryBuilder } =
		useQueryBuilder();

	const panelType = panelTypeFromQueryBuilder || PANEL_TYPES.LIST;

	const [orderBy, setOrderBy] = useState<string>('timestamp:desc');

	const {
		selectedTime: globalSelectedTime,
		maxTime,
		minTime,
		loading: timeRangeUpdateLoading,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	const { options, config } = useOptionsMenu({
		dataSource: DataSource.TRACES,
		aggregateOperator: 'count',
		initialOptions: {
			selectColumns: defaultSelectedColumns,
		},
	});

	const { queryData: paginationQueryData } = useUrlQueryData<Pagination>(
		QueryParams.pagination,
	);
	const paginationConfig =
		paginationQueryData ?? getDefaultPaginationConfig(PER_PAGE_OPTIONS);

	const requestQuery = useMemo(
		() => getListViewQuery(stagedQuery || initialQueryAIWithType, orderBy),
		[stagedQuery, orderBy],
	);

	// Stable sorted-name signature for the queryKey.
	// - Drag updates selectColumns; raw queryKey would churn on reorder.
	// - Trace API fetches only listed columns → add/remove must refetch.
	// - Sorted-name signature: stable on reorder, changes on add/remove.
	const selectColumnsSignature = useMemo(
		() =>
			(options?.selectColumns ?? [])
				.map((c) => c.name)
				.sort()
				.join(','),
		[options?.selectColumns],
	);

	const queryKey = useMemo(
		() => [
			REACT_QUERY_KEY.GET_QUERY_RANGE,
			globalSelectedTime,
			maxTime,
			minTime,
			stagedQuery,
			panelType,
			paginationConfig,
			selectColumnsSignature,
			orderBy,
		],
		[
			stagedQuery,
			panelType,
			globalSelectedTime,
			paginationConfig,
			selectColumnsSignature,
			maxTime,
			minTime,
			orderBy,
		],
	);

	if (queryKeyRef) {
		queryKeyRef.current = queryKey;
	}

	const { data, isFetching, isLoading, isError, error } = useGetQueryRange(
		{
			query: requestQuery,
			graphType: panelType,
			selectedTime: 'GLOBAL_TIME' as const,
			globalSelectedInterval: globalSelectedTime as CustomTimeType,
			params: {
				dataSource: 'traces',
			},
			tableParams: {
				pagination: paginationConfig,
				selectColumns: options?.selectColumns,
			},
		},
		ENTITY_VERSION_V5,
		{
			queryKey,
			enabled:
				// don't make api call while the time range state in redux is loading
				!timeRangeUpdateLoading &&
				!!stagedQuery &&
				panelType === PANEL_TYPES.LIST &&
				!!options?.selectColumns?.length,
		},
	);

	useEffect(() => {
		if (data?.payload) {
			setWarning(data?.warning);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.payload, data?.warning]);

	useEffect(() => {
		if (isLoading || isFetching) {
			setIsLoadingQueries(true);
		} else {
			setIsLoadingQueries(false);
		}
	}, [isLoading, isFetching, setIsLoadingQueries]);

	const queryTableDataResult = data?.payload?.data?.newResult?.data?.result;
	const queryTableData = useMemo(
		() => queryTableDataResult || [],
		[queryTableDataResult],
	);

	const columns = useMemo<TableColumnDef<TracesTableRow>[]>(() => {
		const fields = [
			TIMESTAMP_FIELD,
			...(options?.selectColumns ?? []).filter(
				(field) => field.name !== TIMESTAMP_FIELD.name,
			),
		];
		return fields.map((field) => getFieldColumn(field));
	}, [options?.selectColumns]);

	const rows = useMemo(
		() => transformSpanRows(queryTableData),
		[queryTableData],
	);

	const handleColumnOrderChange = useCallback(
		(reordered: TableColumnDef<TracesTableRow>[]): void => {
			config?.addColumn?.onReorder(reordered.map((column) => column.id));
		},
		[config],
	);

	const handleOrderChange = useCallback((value: string) => {
		setOrderBy(value);
	}, []);

	useEffect(() => {
		if (!isLoading && !isFetching && !isError && rows.length !== 0) {
			void logEvent('Traces Explorer: Data present', {
				panelType,
			});
		}
	}, [isLoading, isFetching, isError, rows, panelType]);

	return (
		<div className={styles.container}>
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

				<DownloadOptionsMenu
					dataSource={DataSource.TRACES}
					selectedColumns={options?.selectColumns}
				/>

				<TraceExplorerControls
					isLoading={isFetching}
					totalCount={rows.length}
					config={config}
					perPageOptions={PER_PAGE_OPTIONS}
				/>
			</div>

			<TracesTable
				data={rows}
				columns={columns}
				panelType="LIST"
				getRowHref={getTraceLink}
				isLoading={isLoading}
				isFetching={isFetching}
				isError={isError}
				error={error}
				isFilterApplied={isFilterApplied}
				onColumnOrderChange={handleColumnOrderChange}
				onColumnRemove={config?.addColumn?.onRemove}
			/>
		</div>
	);
}

ListView.defaultProps = {
	queryKeyRef: undefined,
};

export default memo(ListView);
