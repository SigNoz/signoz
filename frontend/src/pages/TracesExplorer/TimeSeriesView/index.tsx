import {
	Dispatch,
	MutableRefObject,
	SetStateAction,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useSelector } from 'react-redux';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { BuilderUnitsFilter } from 'container/QueryBuilder/filters';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { convertDataValueToMs } from 'container/TimeSeriesView/utils';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import APIError from 'types/api/error';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import './TimeSeriesView.styles.scss';

function TimeSeriesViewContainer({
	dataSource = DataSource.TRACES,
	isFilterApplied,
	setWarning,
	setIsLoadingQueries,
	queryKeyRef,
}: TimeSeriesViewProps): JSX.Element {
	const { stagedQuery, currentQuery, panelType } = useQueryBuilder();

	const isValidToConvertToMs = useMemo(() => {
		const isValid: boolean[] = [];

		currentQuery.builder.queryData.forEach(
			({ aggregateAttribute, aggregateOperator }) => {
				const isExistDurationNanoAttribute =
					aggregateAttribute?.key === 'durationNano' ||
					aggregateAttribute?.key === 'duration_nano';

				const isCountOperator =
					aggregateOperator === 'count' || aggregateOperator === 'count_distinct';

				isValid.push(!isCountOperator && isExistDurationNanoAttribute);
			},
		);

		return isValid.every(Boolean);
	}, [currentQuery]);

	const [yAxisUnit, setYAxisUnit] = useState<string>(
		isValidToConvertToMs ? 'ms' : 'short',
	);

	const onUnitChangeHandler = (value: string): void => {
		setYAxisUnit(value);
	};

	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

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
		// eslint-disable-next-line no-param-reassign
		queryKeyRef.current = queryKey;
	}

	const { data, isLoading, isFetching, isError, error } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap[dataSource],
			graphType: panelType || PANEL_TYPES.TIME_SERIES,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource,
			},
		},
		// ENTITY_VERSION_V4,
		ENTITY_VERSION_V5,
		{
			queryKey,
			enabled: !!stagedQuery && panelType === PANEL_TYPES.TIME_SERIES,
		},
	);

	useEffect(() => {
		if (data?.payload) {
			setWarning(data?.warning);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.payload, data?.warning]);

	const responseData = useMemo(
		() => (isValidToConvertToMs ? convertDataValueToMs(data) : data),
		[data, isValidToConvertToMs],
	);

	useEffect(() => {
		if (isLoading || isFetching) {
			setIsLoadingQueries(true);
		} else {
			setIsLoadingQueries(false);
		}
	}, [isLoading, isFetching, setIsLoadingQueries]);

	return (
		<div className="trace-explorer-time-series-view-container">
			<div className="trace-explorer-time-series-view-container-header">
				<BuilderUnitsFilter onChange={onUnitChangeHandler} yAxisUnit={yAxisUnit} />
			</div>
			<TimeSeriesView
				isFilterApplied={isFilterApplied}
				isError={isError}
				error={error as APIError}
				isLoading={isLoading || isFetching}
				data={responseData}
				yAxisUnit={yAxisUnit}
				dataSource={dataSource}
				setWarning={setWarning}
			/>
		</div>
	);
}

interface TimeSeriesViewProps {
	dataSource?: DataSource;
	isFilterApplied: boolean;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	setIsLoadingQueries: Dispatch<SetStateAction<boolean>>;
	queryKeyRef?: MutableRefObject<any>;
}

TimeSeriesViewContainer.defaultProps = {
	dataSource: DataSource.TRACES,
	queryKeyRef: undefined,
};

export default TimeSeriesViewContainer;
