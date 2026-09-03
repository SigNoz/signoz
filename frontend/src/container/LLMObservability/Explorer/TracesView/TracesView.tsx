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
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import ListViewOrderBy from 'components/OrderBy/ListViewOrderBy';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { initialQueryAIWithType, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { getTraceLink } from '../ListView/utils';
import { TracesTableRow } from '../TracesTable/getFieldColumn';
import TracesTable from '../TracesTable/TracesTable';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination } from 'hooks/queryPagination';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { ArrowUp10, Minus } from '@signozhq/icons';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import ExplorerControls from '../Controls';
import {
	TRACE_VIEW_DEFAULT_ORDER_BY,
	TRACE_VIEW_STATIC_ORDER_BY_KEYS,
} from '../constants';
import { getListViewQuery } from '../explorerUtils';
import { PER_PAGE_OPTIONS } from './configs';
import { useTraceViewColumns } from './useTraceViewColumns';
import styles from './TracesView.module.scss';

interface TracesViewProps {
	isFilterApplied: boolean;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	setIsLoadingQueries: Dispatch<SetStateAction<boolean>>;
	queryKeyRef?: MutableRefObject<QueryKey | undefined>;
}

function TracesView({
	isFilterApplied,
	setWarning,
	setIsLoadingQueries,
	queryKeyRef,
}: TracesViewProps): JSX.Element {
	const { stagedQuery, panelType } = useQueryBuilder();

	const [orderBy, setOrderBy] = useState<string>(TRACE_VIEW_DEFAULT_ORDER_BY);

	const {
		columns,
		selectedFields,
		onFieldsChange,
		requiredFields,
		isLoading: isColumnsLoading,
	} = useTraceViewColumns();

	const {
		selectedTime: globalSelectedTime,
		maxTime,
		minTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	const { queryData: paginationQueryData } = useUrlQueryData<Pagination>(
		QueryParams.pagination,
	);

	const transformedQuery = useMemo(
		() => getListViewQuery(stagedQuery || initialQueryAIWithType, orderBy),
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

	const rows = useMemo<TracesTableRow[]>(
		() =>
			(responseData ?? []).map((item) => {
				const row = item.data;
				return { ...row, id: row.trace_id };
			}) as TracesTableRow[],
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
		if (!isLoading && !isFetching && !isError && rows.length !== 0) {
			void logEvent('Traces Explorer: Data present', {
				panelType: 'TRACE',
			});
		}
	}, [isLoading, isFetching, isError, rows.length]);

	const handleOrderChange = useCallback((value: string): void => {
		setOrderBy(value);
	}, []);

	const fieldsSelectorConfig = useMemo(
		() => ({ fieldsSelector: { value: selectedFields, onFieldsChange } }),
		[selectedFields, onFieldsChange],
	);

	return (
		<div className={styles.container}>
			<div className={styles.actionsContainer}>
				<div className="trace-explorer-controls">
					<div className={styles.orderByContainer}>
						<div className={styles.orderByLabel}>
							Order by <Minus size={14} /> <ArrowUp10 size={14} />
						</div>

						<ListViewOrderBy
							value={orderBy}
							onChange={handleOrderChange}
							dataSource={DataSource.TRACES}
							builderQueryType="builder_ai_query"
							fieldContext={TelemetrytypesFieldContextDTO.trace}
							staticOptionKeys={TRACE_VIEW_STATIC_ORDER_BY_KEYS}
						/>
					</div>

					<ExplorerControls
						isLoading={isLoading}
						totalCount={rows.length}
						perPageOptions={PER_PAGE_OPTIONS}
						config={fieldsSelectorConfig}
						addStaticFields="ai_o11y"
						requiredFields={requiredFields}
					/>
				</div>
			</div>

			<TracesTable
				data={rows}
				columns={columns}
				columnStorageKey={LOCALSTORAGE.AI_OBSERVABILITY_TRACE_VIEW_COLUMNS}
				respectColumnOrder
				panelType="TRACE"
				getRowHref={getTraceLink}
				isLoading={isLoading || isColumnsLoading}
				isFetching={isFetching}
				isError={isError}
				error={error}
				isFilterApplied={isFilterApplied}
			/>
		</div>
	);
}

TracesView.defaultProps = {
	queryKeyRef: undefined,
};

export default memo(TracesView);
