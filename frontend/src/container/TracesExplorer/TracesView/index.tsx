import {
	Dispatch,
	memo,
	MutableRefObject,
	ReactNode,
	SetStateAction,
	useEffect,
	useMemo,
} from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import DownloadOptionsMenu from 'components/DownloadOptionsMenu/DownloadOptionsMenu';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { LOCALSTORAGE } from 'constants/localStorage';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { getListViewQuery } from 'container/TracesExplorer/explorerUtils';
import { getTraceLink } from 'container/TracesExplorer/ListView/utils';
import TracesTable from 'container/TracesExplorer/TracesTable/TracesTable';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { useKeepRowsForSameQuery } from 'container/TracesExplorer/TracesTable/useKeepRowsForSameQuery';
import { useTracesTablePagination } from 'container/TracesExplorer/TracesTable/useTracesTablePagination';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import DOCLINKS from 'utils/docLinks';

import { columns } from './configs';

import styles from './TracesView.module.scss';

interface TracesViewProps {
	isFilterApplied: boolean;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	setIsLoadingQueries: Dispatch<SetStateAction<boolean>>;
	queryKeyRef?: MutableRefObject<any>;
	headerActions?: ReactNode;
}

function TracesView({
	isFilterApplied,
	setWarning,
	setIsLoadingQueries,
	queryKeyRef,
	headerActions,
}: TracesViewProps): JSX.Element {
	const { stagedQuery, panelType } = useQueryBuilder();

	const {
		selectedTime: globalSelectedTime,
		maxTime,
		minTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	const pagination = useTracesTablePagination();

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
			pagination.request,
		],
		[
			globalSelectedTime,
			maxTime,
			minTime,
			stagedQuery,
			panelType,
			pagination.request,
		],
	);

	if (queryKeyRef) {
		queryKeyRef.current = queryKey;
	}

	const { data, isLoading, isFetching, isError, error, isPreviousData } =
		useGetQueryRange(
			{
				query: transformedQuery,
				graphType: panelType || PANEL_TYPES.TRACE,
				selectedTime: 'GLOBAL_TIME',
				globalSelectedInterval: globalSelectedTime,
				params: {
					dataSource: 'traces',
				},
				tableParams: {
					pagination: pagination.request,
				},
			},
			ENTITY_VERSION_V5,
			{
				queryKey,
				keepPreviousData: true,
				enabled: !!stagedQuery && panelType === PANEL_TYPES.TRACE,
			},
		);

	useEffect(() => {
		if (data?.payload) {
			setWarning(data?.warning);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.payload, data?.warning]);

	const keepRows = useKeepRowsForSameQuery(isPreviousData);
	const responseData = keepRows
		? data?.payload?.data?.newResult?.data?.result[0]?.list
		: undefined;

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
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					This tab only shows Root Spans. More details
					<Typography.Link
						variant="paragraph"
						size="base"
						weight="regular"
						textOverflow="wrap"
						href={DOCLINKS.TRACES_DETAILS_LINK}
						target="_blank"
					>
						{' '}
						here
					</Typography.Link>
				</Typography>

				<div className={styles.controls}>
					{headerActions}
					<DownloadOptionsMenu
						dataSource={DataSource.TRACES}
						panelType={PANEL_TYPES.TRACE}
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
				pagination={pagination}
			/>
		</div>
	);
}

TracesView.defaultProps = {
	queryKeyRef: undefined,
	headerActions: undefined,
};

export default memo(TracesView);
