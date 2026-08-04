/* eslint-disable sonarjs/cognitive-complexity */
import {
	Dispatch,
	memo,
	MutableRefObject,
	SetStateAction,
	useEffect,
	useMemo,
} from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import DownloadOptionsMenu from 'components/DownloadOptionsMenu/DownloadOptionsMenu';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
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
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import DOCLINKS from 'utils/docLinks';

import TraceExplorerControls from '../Controls';
import { TracesLoading } from '../TraceLoading/TraceLoading';
import { getTraceViewColumns, PER_PAGE_OPTIONS } from './configs';
import { ActionsContainer, Container } from './styles';
import useTraceViewColumns from './useTraceViewColumns';

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

	const { queryData: paginationQueryData } = useUrlQueryData<Pagination>(
		QueryParams.pagination,
	);

	// POC: own column visibility — not useOptionsMenu (would collide with List View)
	const { visibleKeys, selectedFields, availableFields, onFieldsChange } =
		useTraceViewColumns();

	const fieldsSelectorConfig = useMemo(
		() => ({
			fieldsSelector: {
				value: selectedFields,
				onFieldsChange,
			},
		}),
		[selectedFields, onFieldsChange],
	);

	const visibleColumns = useMemo(
		() => getTraceViewColumns(visibleKeys),
		[visibleKeys],
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
			// POC D5: column visibility is client-side — do NOT put visibleKeys in queryKey
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
			// POC D5: never send selectColumns — backend returns all columns;
			// visibility is client-side so toggling is refetch-free.
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
						<DownloadOptionsMenu
							dataSource={DataSource.TRACES}
							panelType={PANEL_TYPES.TRACE}
						/>

						<TraceExplorerControls
							isLoading={isLoading}
							totalCount={responseData?.length || 0}
							perPageOptions={PER_PAGE_OPTIONS}
							config={fieldsSelectorConfig}
							availableFields={availableFields}
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
					columns={visibleColumns}
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
};

export default memo(TracesView);
