import {
	Dispatch,
	memo,
	MutableRefObject,
	SetStateAction,
	useCallback,
	useMemo,
} from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { Typography } from '@signozhq/ui/typography';
import { getTraceLink } from 'components/Traces/TableView/getTraceLink';
import { TracesTable } from 'components/Traces/TableView/TracesTable';
import { useTraceInfiniteQuery } from 'components/Traces/TableView/useTraceInfiniteQuery';
import { useTracesTableColumns } from 'components/Traces/TableView/useTracesTableColumns';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { LOCALSTORAGE } from 'constants/localStorage';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { getListViewQuery } from 'container/TracesExplorer/explorerUtils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import type { Pagination } from 'hooks/queryPagination';
import type { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import type { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import { GlobalReducer } from 'types/reducer/globalTime';
import DOCLINKS from 'utils/docLinks';

import { columns as baseColumns, TraceRow } from './configs';

import styles from './TracesView.module.scss';

interface TracesViewProps {
	isFilterApplied: boolean;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	setIsLoadingQueries: Dispatch<SetStateAction<boolean>>;
	queryKeyRef?: MutableRefObject<any>;
}

function TracesView({
	isFilterApplied,
	setWarning,
	setIsLoadingQueries,
	queryKeyRef,
}: TracesViewProps): JSX.Element {
	const { stagedQuery, panelType } = useQueryBuilder();

	const {
		selectedTime: globalSelectedTime,
		maxTime,
		minTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	const transformedQuery = useMemo(
		() => getListViewQuery(stagedQuery || initialQueriesMap.traces),
		[stagedQuery],
	);

	const buildRequest = useCallback(
		(pagination: Pagination): GetQueryResultsProps => ({
			query: transformedQuery,
			graphType: panelType || PANEL_TYPES.TRACE,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: { dataSource: 'traces' },
			tableParams: { pagination },
		}),
		[transformedQuery, panelType, globalSelectedTime],
	);

	const transformResponse = useCallback(
		(
			payload: MetricQueryRangeSuccessResponse['payload'] | undefined,
		): TraceRow[] => {
			const list = payload?.data?.newResult?.data?.result?.[0]?.list;
			if (!list) {
				return [];
			}
			// API returns trace-summary rows; the `ListItem.data` static type is the
			// legacy logs shape, so route through `unknown` to land on `TraceRow`.
			return list.map((li) => {
				const row = li.data as unknown as TraceRow;
				return { ...row, id: row.trace_id };
			});
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
	} = useTraceInfiniteQuery<TraceRow>({
		queryDeps: [stagedQuery, panelType, globalSelectedTime, maxTime, minTime],
		buildRequest,
		transformResponse,
		enabled: !!stagedQuery && panelType === PANEL_TYPES.TRACE,
		entityVersion: ENTITY_VERSION_V5,
		queryKeyRef,
		setIsLoadingQueries,
		setWarning,
		panelType: 'TRACE',
	});

	const tableColumns = useTracesTableColumns<TraceRow>({ baseColumns });

	return (
		<div className={styles.container}>
			{accumulatedRows.length !== 0 && (
				<div className={styles.actionsContainer}>
					<Typography>
						This tab only shows Root Spans. More details
						<Typography.Link href={DOCLINKS.TRACES_DETAILS_LINK} target="_blank">
							{' '}
							here
						</Typography.Link>
					</Typography>
				</div>
			)}

			<TracesTable<TraceRow>
				data={accumulatedRows}
				columns={tableColumns}
				isLoading={isLoading}
				isFetching={isFetching}
				isError={isError}
				error={error}
				isFilterApplied={isFilterApplied}
				panelType="TRACE"
				columnStorageKey={LOCALSTORAGE.TRACES_VIEW_COLUMNS}
				getRowHref={getTraceLink}
				onEndReached={handleEndReached}
			/>
		</div>
	);
}

TracesView.defaultProps = {
	queryKeyRef: undefined,
};

export default memo(TracesView);
