import {
	Dispatch,
	memo,
	MutableRefObject,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
} from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { Space } from 'antd';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { QueryTable } from 'container/QueryTable';
import { createGenericDownloadableData } from 'container/QueryTable/utils';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import APIError from 'types/api/error';
import { QueryDataV3 } from 'types/api/widgets/getQuery';
import { GlobalReducer } from 'types/reducer/globalTime';

function isTraceTableDataDownloadable(data: Record<string, string>[]): boolean {
	if (data.length !== 1) {
		return data.length > 0;
	}

	const entries = Object.entries(data[0]);

	if (entries.length !== 1) {
		return true;
	}

	const [[columnName, value]] = entries;

	return columnName !== 'count()' || Number(value) !== 0;
}

function TableView({
	setWarning,
	setIsLoadingQueries,
	queryKeyRef,
}: {
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	setIsLoadingQueries: Dispatch<SetStateAction<boolean>>;
	queryKeyRef?: MutableRefObject<any>;
}): JSX.Element {
	const { stagedQuery, panelType } = useQueryBuilder();

	const {
		selectedTime: globalSelectedTime,
		maxTime,
		minTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	const queryKey = useMemo(
		() => [
			REACT_QUERY_KEY.GET_QUERY_RANGE,
			globalSelectedTime,
			maxTime,
			minTime,
			stagedQuery,
		],
		[globalSelectedTime, maxTime, minTime, stagedQuery],
	);

	if (queryKeyRef) {
		queryKeyRef.current = queryKey;
	}

	const { data, isLoading, isFetching, isError, error } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap.traces,
			graphType: panelType || PANEL_TYPES.TABLE,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource: 'traces',
			},
		},
		ENTITY_VERSION_V5,
		{
			queryKey,
			enabled: !!stagedQuery && panelType === PANEL_TYPES.TABLE,
		},
	);

	useEffect(() => {
		if (isLoading || isFetching) {
			setIsLoadingQueries(true);
		} else {
			setIsLoadingQueries(false);
		}
	}, [isLoading, isFetching, setIsLoadingQueries]);

	const queryTableData = useMemo(
		() =>
			data?.payload?.data?.newResult?.data?.result ||
			data?.payload.data.result ||
			[],
		[data],
	);

	const getDownloadFileName = useCallback(() => {
		const timestamp = new Date()
			.toISOString()
			.replace('T', '-')
			.replace(/\..+$/, '')
			.replace(/:/g, '_');

		return `trace-explorer-table-data-as-table-${timestamp}`;
	}, []);

	useEffect(() => {
		if (data?.payload) {
			setWarning(data.warning);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.payload, data?.warning]);

	return (
		<Space.Compact block direction="vertical">
			{isError && error && <ErrorInPlace error={error as APIError} />}
			{!isError && (
				<QueryTable
					query={stagedQuery || initialQueriesMap.traces}
					queryTableData={queryTableData as QueryDataV3[]}
					loading={isLoading}
					downloadOption={{
						isDownloadEnabled: true,
						fileName: getDownloadFileName,
						placement: 'block',
						dataFormatter: createGenericDownloadableData,
						isDataDownloadable: isTraceTableDataDownloadable,
					}}
					sticky
				/>
			)}
		</Space.Compact>
	);
}

TableView.defaultProps = {
	queryKeyRef: undefined,
};

export default memo(TableView);
