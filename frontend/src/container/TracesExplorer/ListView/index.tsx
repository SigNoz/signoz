import {
	Dispatch,
	memo,
	MutableRefObject,
	SetStateAction,
	useCallback,
	useMemo,
	useState,
} from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { ArrowUp10, Minus } from '@signozhq/icons';
import DownloadOptionsMenu from 'components/DownloadOptionsMenu/DownloadOptionsMenu';
import ListViewOrderBy from 'components/OrderBy/ListViewOrderBy';
import { TracesTable } from 'components/Traces/TableView/TracesTable';
import { useTraceInfiniteQuery } from 'components/Traces/TableView/useTraceInfiniteQuery';
import { useTracesTableColumns } from 'components/Traces/TableView/useTracesTableColumns';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { LOCALSTORAGE } from 'constants/localStorage';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useOptionsMenu } from 'container/OptionsMenu';
import { CustomTimeType } from 'container/TopNav/DateTimeSelectionV2/types';
import TraceExplorerControls from 'container/TracesExplorer/Controls';
import { getListViewQuery } from 'container/TracesExplorer/explorerUtils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import type { Pagination } from 'hooks/queryPagination';
import type { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { useTimezone } from 'providers/Timezone';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import type { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { getTraceLink } from 'components/Traces/TableView/getTraceLink';
import {
	makeListFieldCol,
	makeTimestampCol,
	SpanRow,
	transformSpanRows,
} from './utils';

import './ListView.styles.scss';

import styles from './ListView.module.scss';

interface ListViewProps {
	isFilterApplied: boolean;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	setIsLoadingQueries: Dispatch<SetStateAction<boolean>>;
	queryKeyRef?: MutableRefObject<any>;
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
		storageKey: LOCALSTORAGE.TRACES_LIST_OPTIONS,
		dataSource: DataSource.TRACES,
		aggregateOperator: 'count',
	});

	// Stable sorted-name signature for the queryKey + reset trigger.
	// - Drag updates selectColumns; raw queryKey would churn on reorder.
	// - Trace API fetches only listed columns → add/remove must refetch from scratch.
	// - Sorted-name signature: stable on reorder, changes on add/remove.
	const selectColumnsSignature = useMemo(
		() =>
			(options?.selectColumns ?? [])
				.map((c) => c.name)
				.sort()
				.join(','),
		[options?.selectColumns],
	);

	const requestQuery = useMemo(
		() => getListViewQuery(stagedQuery || initialQueriesMap.traces, orderBy),
		[stagedQuery, orderBy],
	);

	const buildRequest = useCallback(
		(pagination: Pagination): GetQueryResultsProps => ({
			query: requestQuery,
			graphType: panelType,
			selectedTime: 'GLOBAL_TIME' as const,
			globalSelectedInterval: globalSelectedTime as CustomTimeType,
			params: { dataSource: 'traces' },
			tableParams: {
				pagination,
				selectColumns: options?.selectColumns,
			},
		}),
		[requestQuery, panelType, globalSelectedTime, options?.selectColumns],
	);

	const transformResponse = useCallback(
		(
			payload: MetricQueryRangeSuccessResponse['payload'] | undefined,
		): SpanRow[] => {
			const result = payload?.data?.newResult?.data?.result;
			return result ? transformSpanRows(result) : [];
		},
		[],
	);

	const {
		rows: accumulatedRows,
		isLoading,
		isFetching,
		isError,
		error,
		handleEndReached,
	} = useTraceInfiniteQuery<SpanRow>({
		queryDeps: [
			stagedQuery,
			panelType,
			globalSelectedTime,
			maxTime,
			minTime,
			orderBy,
			selectColumnsSignature,
		],
		buildRequest,
		transformResponse,
		enabled:
			!timeRangeUpdateLoading &&
			!!stagedQuery &&
			panelType === PANEL_TYPES.LIST &&
			!!options?.selectColumns?.length,
		entityVersion: ENTITY_VERSION_V5,
		queryKeyRef,
		setIsLoadingQueries,
		setWarning,
		panelType,
	});

	const handleOrderChange = useCallback((value: string) => {
		setOrderBy(value);
	}, []);

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const baseColumns = useMemo(
		() => [
			makeTimestampCol(formatTimezoneAdjustedTimestamp),
			...(options?.selectColumns ?? []).map(makeListFieldCol),
		],
		[formatTimezoneAdjustedTimestamp, options?.selectColumns],
	);

	const tableColumns = useTracesTableColumns<SpanRow>({ baseColumns });

	const handleColumnOrderChange = useCallback(
		(cols: { id: string }[]): void => {
			config?.addColumn?.onReorder(cols.map((c) => c.id));
		},
		[config],
	);

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

				<TraceExplorerControls config={config} />
			</div>

			<TracesTable<SpanRow>
				data={accumulatedRows}
				columns={tableColumns}
				isLoading={isLoading}
				isFetching={isFetching}
				isError={isError}
				error={error}
				isFilterApplied={isFilterApplied}
				panelType="LIST"
				columnStorageKey={LOCALSTORAGE.TRACES_LIST_COLUMNS}
				respectColumnOrder={false}
				onColumnOrderChange={handleColumnOrderChange}
				onColumnRemove={config?.addColumn?.onRemove}
				getRowHref={getTraceLink}
				onEndReached={handleEndReached}
			/>
		</div>
	);
}

ListView.defaultProps = {
	queryKeyRef: undefined,
};

export default memo(ListView);
