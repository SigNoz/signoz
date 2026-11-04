import {
	Dispatch,
	memo,
	MutableRefObject,
	ReactNode,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
} from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import logEvent from 'api/common/logEvent';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import DownloadOptionsMenu from 'components/DownloadOptionsMenu/DownloadOptionsMenu';
import ListViewOrderBy from 'components/OrderBy/ListViewOrderBy';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import TracesTable from 'container/TracesExplorer/TracesTable/TracesTable';
import {
	getFieldColumn,
	TracesTableRow,
} from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { LOCALSTORAGE } from 'constants/localStorage';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useOptionsMenu } from 'container/OptionsMenu';
import TraceExplorerControls from 'container/TracesExplorer/Controls';
import { getListViewQuery } from 'container/TracesExplorer/explorerUtils';
import SpanDrawer from 'container/TracesExplorer/SpanDrawer/SpanDrawer';
import { useSpanDrawer } from 'container/TracesExplorer/SpanDrawer/useSpanDrawer';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { getListOrderBy, setListOrderBy } from 'utils/explorerUtils';
import { ArrowUp10, Minus } from '@signozhq/icons';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { defaultSelectedColumns, TIMESTAMP_FIELD } from './configs';
import { useListViewInfiniteQuery } from './useListViewInfiniteQuery';
import { getTraceLink } from './utils';

import styles from './ListView.module.scss';

interface ListViewProps {
	isFilterApplied: boolean;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	setIsLoadingQueries: Dispatch<SetStateAction<boolean>>;
	queryKeyRef?: MutableRefObject<any>;
	headerActions?: ReactNode;
}

function ListView({
	isFilterApplied,
	setWarning,
	setIsLoadingQueries,
	queryKeyRef,
	headerActions,
}: ListViewProps): JSX.Element {
	const {
		stagedQuery,
		currentQuery,
		redirectWithQueryBuilderData,
		panelType: panelTypeFromQueryBuilder,
	} = useQueryBuilder();

	const panelType = panelTypeFromQueryBuilder || PANEL_TYPES.LIST;

	const orderBy = useMemo(() => getListOrderBy(stagedQuery), [stagedQuery]);

	const {
		selectedTime: globalSelectedTime,
		maxTime,
		minTime,
		loading: timeRangeUpdateLoading,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	const { options, config } = useOptionsMenu({
		storageKey: LOCALSTORAGE.TRACES_LIST_OPTIONS,
		sourcePage: SavedviewtypesSourceDTO.traces,
		aggregateOperator: 'count',
		initialOptions: {
			selectColumns: defaultSelectedColumns,
		},
	});

	// Empty selectFields makes the API return every span field.
	const requestQuery = useMemo(() => {
		const query = getListViewQuery(
			stagedQuery || initialQueriesMap.traces,
			orderBy,
		);
		query.builder.queryData.forEach((queryData) => {
			queryData.selectColumns = [];
		});
		query.builder.queryTraceOperator?.forEach((queryTraceOperator) => {
			queryTraceOperator.selectColumns = [];
		});
		return query;
	}, [stagedQuery, orderBy]);

	const queryKey = useMemo(
		() => [
			REACT_QUERY_KEY.GET_QUERY_RANGE,
			globalSelectedTime,
			maxTime,
			minTime,
			stagedQuery,
			panelType,
		],
		[stagedQuery, panelType, globalSelectedTime, maxTime, minTime],
	);

	if (queryKeyRef) {
		queryKeyRef.current = queryKey;
	}

	const { rows, warning, isFetching, isLoading, isError, error, loadMore } =
		useListViewInfiniteQuery({
			query: requestQuery,
			queryKey,
			enabled:
				// don't make api call while the time range state in redux is loading
				!timeRangeUpdateLoading && !!stagedQuery && panelType === PANEL_TYPES.LIST,
		});

	useEffect(() => {
		setWarning(warning);
	}, [warning, setWarning]);

	useEffect(() => {
		if (isLoading || isFetching) {
			setIsLoadingQueries(true);
		} else {
			setIsLoadingQueries(false);
		}
	}, [isLoading, isFetching, setIsLoadingQueries]);

	const { tableProps, openTraceColumn, drawerProps, onPressInside } =
		useSpanDrawer(rows);

	const columns = useMemo<TableColumnDef<TracesTableRow>[]>(() => {
		const fields = [
			TIMESTAMP_FIELD,
			...(options?.selectColumns ?? []).filter(
				(field) => field.name !== TIMESTAMP_FIELD.name,
			),
		];
		const fieldColumns = fields.map((field) =>
			getFieldColumn(field, PANEL_TYPES.LIST),
		);
		return [openTraceColumn, ...fieldColumns];
	}, [options?.selectColumns, openTraceColumn]);

	const handleColumnOrderChange = useCallback(
		(cols: TableColumnDef<TracesTableRow>[]): void => {
			config?.addColumn?.onReorder(cols.map((c) => c.id));
		},
		[config],
	);

	const handleOrderChange = useCallback(
		(value: string) => {
			redirectWithQueryBuilderData(setListOrderBy(currentQuery, value));
		},
		[currentQuery, redirectWithQueryBuilderData],
	);

	useEffect(() => {
		if (!isLoading && !isFetching && !isError && rows.length !== 0) {
			void logEvent('Traces Explorer: Data present', {
				panelType,
			});
		}
	}, [isLoading, isFetching, isError, rows, panelType]);

	return (
		<div className={styles.container}>
			<div className={styles.controls}>
				{headerActions}
				<div className={styles.orderBy}>
					<div className={styles.orderByLabel}>
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

			{/* A press in the table or the drawer (a portal) keeps the drawer open. */}
			<div className={styles.drawerScope} onPointerDownCapture={onPressInside}>
				<TracesTable
					data={rows}
					columns={columns}
					columnStorageKey={LOCALSTORAGE.TRACES_LIST_COLUMNS}
					panelType="LIST"
					getRowHref={getTraceLink}
					{...tableProps}
					isLoading={isLoading}
					isFetching={isFetching}
					isError={isError}
					error={error}
					isFilterApplied={isFilterApplied}
					onColumnOrderChange={handleColumnOrderChange}
					onColumnRemove={config?.addColumn?.onRemove}
					onEndReached={loadMore}
				/>

				<SpanDrawer {...drawerProps} />
			</div>
		</div>
	);
}

ListView.defaultProps = {
	queryKeyRef: undefined,
	headerActions: undefined,
};

export default memo(ListView);
