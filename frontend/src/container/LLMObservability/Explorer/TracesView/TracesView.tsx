import {
	Dispatch,
	memo,
	MutableRefObject,
	SetStateAction,
	useEffect,
	useMemo,
} from 'react';
import { QueryKey } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import DownloadOptionsMenu from 'components/DownloadOptionsMenu/DownloadOptionsMenu';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import TraceExplorerControls from 'container/TracesExplorer/Controls';
import { getListViewQuery } from 'container/TracesExplorer/explorerUtils';
import { getTraceLink } from 'container/TracesExplorer/ListView/utils';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';
import TracesTable from 'container/TracesExplorer/TracesTable/TracesTable';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination } from 'hooks/queryPagination';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import DOCLINKS from 'utils/docLinks';

import { columns, PER_PAGE_OPTIONS } from './configs';
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

	const {
		selectedTime: globalSelectedTime,
		maxTime,
		minTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	const { queryData: paginationQueryData } = useUrlQueryData<Pagination>(
		QueryParams.pagination,
	);

	const transformedQuery = useMemo(
		() => getListViewQuery(stagedQuery || initialQueriesMap.traces),
		[stagedQuery],
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
		],
		[
			globalSelectedTime,
			maxTime,
			minTime,
			stagedQuery,
			panelType,
			paginationQueryData,
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

	return (
		<div className={styles.container}>
			<div className={styles.actionsContainer}>
				<Typography>
					This tab only shows Root Spans. More details
					<Typography.Link href={DOCLINKS.TRACES_DETAILS_LINK} target="_blank">
						{' '}
						here
					</Typography.Link>
				</Typography>

				<div className="trace-explorer-controls">
					<DownloadOptionsMenu
						dataSource={DataSource.TRACES}
						panelType={PANEL_TYPES.TRACE}
					/>

					<TraceExplorerControls
						isLoading={isLoading}
						totalCount={rows.length}
						perPageOptions={PER_PAGE_OPTIONS}
					/>
				</div>
			</div>

			<TracesTable
				data={rows}
				columns={columns}
				columnStorageKey={LOCALSTORAGE.TRACES_VIEW_COLUMNS}
				respectColumnOrder
				panelType="TRACE"
				getRowHref={getTraceLink}
				isLoading={isLoading}
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
