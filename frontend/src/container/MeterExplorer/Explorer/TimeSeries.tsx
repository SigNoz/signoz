import { useEffect, useMemo } from 'react';
import { useQueries } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { isAxiosError } from 'axios';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { initialQueryMeterWithType, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import EmptyMetricsSearch from 'container/MetricsExplorer/Explorer/EmptyMetricsSearch';
import { BuilderUnitsFilter } from 'container/QueryBuilder/filters/BuilderUnitsFilter';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { convertDataValueToMs } from 'container/TimeSeriesView/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlYAxisUnit from 'hooks/useUrlYAxisUnit';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import APIError from 'types/api/error';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

interface TimeSeriesProps {
	onFetchingStateChange?: (isFetching: boolean) => void;
}

function TimeSeries({ onFetchingStateChange }: TimeSeriesProps): JSX.Element {
	const { stagedQuery, currentQuery } = useQueryBuilder();
	const { yAxisUnit, onUnitChange } = useUrlYAxisUnit('');

	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

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

	const queryPayloads = useMemo(
		() => [stagedQuery || initialQueryMeterWithType],
		[stagedQuery],
	);

	const { showErrorModal } = useErrorModal();

	const queries = useQueries(
		queryPayloads.map((payload, index) => ({
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				payload,
				ENTITY_VERSION_V5,
				globalSelectedTime,
				maxTime,
				minTime,
				index,
			],
			queryFn: ({
				signal,
			}: {
				signal?: AbortSignal;
			}): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(
					{
						query: payload,
						graphType: PANEL_TYPES.BAR,
						selectedTime: 'GLOBAL_TIME',
						globalSelectedInterval: globalSelectedTime,
						params: {
							dataSource: DataSource.METRICS,
						},
					},
					ENTITY_VERSION_V5,
					undefined,
					signal,
				),
			enabled: !!payload,
			retry: (failureCount: number, error: unknown): boolean => {
				if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
					return false;
				}

				let status: number | undefined;

				if (error instanceof APIError) {
					status = error.getHttpStatusCode();
				} else if (isAxiosError(error)) {
					status = error.response?.status;
				}

				if (status && status >= 400 && status < 500) {
					return false;
				}

				return failureCount < 3;
			},
			onError: (error: APIError): void => {
				showErrorModal(error);
			},
		})),
	);

	const isFetching = queries.some((q) => q.isFetching);
	useEffect(() => {
		onFetchingStateChange?.(isFetching);
	}, [isFetching, onFetchingStateChange]);

	const data = useMemo(() => queries.map(({ data }) => data) ?? [], [queries]);

	const responseData = useMemo(
		() =>
			data.map((datapoint) =>
				isValidToConvertToMs ? convertDataValueToMs(datapoint) : datapoint,
			),
		[data, isValidToConvertToMs],
	);

	const hasMetricSelected = useMemo(
		() => currentQuery.builder.queryData.some((q) => q.aggregateAttribute?.key),
		[currentQuery],
	);

	return (
		<div className="meter-time-series-container">
			<BuilderUnitsFilter onChange={onUnitChange} yAxisUnit={yAxisUnit} />
			<div className="time-series-container">
				{!hasMetricSelected && <EmptyMetricsSearch />}
				{hasMetricSelected &&
					responseData.map((datapoint, index) => (
						<div
							className="time-series-view-panel"
							// eslint-disable-next-line react/no-array-index-key
							key={index}
						>
							<TimeSeriesView
								isFilterApplied={false}
								isError={queries[index].isError}
								isLoading={queries[index].isLoading}
								data={datapoint}
								dataSource={DataSource.METRICS}
								yAxisUnit={yAxisUnit}
								panelType={PANEL_TYPES.BAR}
							/>
						</div>
					))}
			</div>
		</div>
	);
}

export default TimeSeries;
