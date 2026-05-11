import { useEffect, useMemo } from 'react';
import { useQueries, useQueryClient } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { Color } from '@signozhq/design-tokens';
import { toast } from '@signozhq/ui/sonner';
import { Button, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import {
	invalidateGetMetricMetadata,
	useUpdateMetricMetadata,
} from 'api/generated/services/metrics';
import { isAxiosError } from 'axios';
import classNames from 'classnames';
import QueryCancelledPlaceholder from 'components/QueryCancelledPlaceholder';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { MAX_QUERY_RETRIES } from 'constants/reactQuery';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { convertDataValueToMs } from 'container/TimeSeriesView/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { TriangleAlert } from '@signozhq/icons';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import APIError from 'types/api/error';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import EmptyMetricsSearch from './EmptyMetricsSearch';
import { TimeSeriesProps } from './types';
import {
	buildUpdateMetricYAxisUnitPayload,
	splitQueryIntoOneChartPerQuery,
} from './utils';

function TimeSeries({
	onFetchingStateChange,
	showOneChartPerQuery,
	setWarning,
	isMetricUnitsLoading,
	metricUnits,
	metricNames,
	handleOpenMetricDetails,
	yAxisUnit,
	setYAxisUnit,
	showYAxisUnitSelector,
	metrics,
	isCancelled = false,
}: TimeSeriesProps): JSX.Element {
	const { stagedQuery, currentQuery } = useQueryBuilder();

	const {
		selectedTime: globalSelectedTime,
		maxTime,
		minTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);
	const queryClient = useQueryClient();

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
		() =>
			showOneChartPerQuery
				? splitQueryIntoOneChartPerQuery(
						stagedQuery || initialQueriesMap[DataSource.METRICS],
						metricNames,
						metricUnits,
					)
				: [stagedQuery || initialQueriesMap[DataSource.METRICS]],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[showOneChartPerQuery, stagedQuery, JSON.stringify(metricUnits)],
	);

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
						graphType: PANEL_TYPES.TIME_SERIES,
						selectedTime: 'GLOBAL_TIME',
						globalSelectedInterval: globalSelectedTime,
						params: {
							dataSource: DataSource.METRICS,
						},
					},
					// ENTITY_VERSION_V4,
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

				return failureCount < MAX_QUERY_RETRIES;
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

	const changeLayoutForOneChartPerQuery = useMemo(
		() => showOneChartPerQuery && queries.length > 1,
		[showOneChartPerQuery, queries],
	);

	const onUnitChangeHandler = (value: string): void => {
		setYAxisUnit(value);
	};

	// Show the save unit button if
	// 1. There is only one metric
	// 2. The metric has no saved unit
	// 3. The user has selected a unit
	const showSaveUnitButton = useMemo(
		() =>
			metricUnits.length === 1 &&
			Boolean(metrics[0]) &&
			!metricUnits[0] &&
			yAxisUnit,
		[metricUnits, metrics, yAxisUnit],
	);

	const { mutate: updateMetricMetadata, isLoading: isUpdatingMetricMetadata } =
		useUpdateMetricMetadata();

	const handleSaveUnit = (): void => {
		if (metrics[0] && yAxisUnit) {
			updateMetricMetadata(
				{
					pathParams: {
						metricName: metricNames[0],
					},
					data: buildUpdateMetricYAxisUnitPayload(
						metricNames[0],
						metrics[0],
						yAxisUnit,
					),
				},
				{
					onSuccess: () => {
						toast.success('Unit saved successfully');
						invalidateGetMetricMetadata(queryClient, {
							metricName: metricNames[0],
						});
					},
					onError: () => {
						toast.error('Failed to save unit');
					},
				},
			);
		}
	};

	return (
		<>
			<div className="y-axis-unit-selector-container">
				{showYAxisUnitSelector && (
					<>
						<YAxisUnitSelector
							onChange={onUnitChangeHandler}
							value={yAxisUnit}
							source={YAxisSource.EXPLORER}
							data-testid="y-axis-unit-selector"
						/>
						{showSaveUnitButton && (
							<div className="save-unit-container">
								<Typography.Text>
									Set the selected unit as the metric unit?
								</Typography.Text>
								<Button
									type="primary"
									size="small"
									disabled={isUpdatingMetricMetadata}
									onClick={handleSaveUnit}
								>
									<Typography.Text>Yes</Typography.Text>
								</Button>
							</div>
						)}
					</>
				)}
			</div>
			<div
				className={classNames({
					'time-series-container': changeLayoutForOneChartPerQuery,
				})}
			>
				{metricNames.length === 0 && <EmptyMetricsSearch />}
				{isCancelled && metricNames.length > 0 && (
					<QueryCancelledPlaceholder subText='Click "Run Query" to load metrics.' />
				)}
				{!isCancelled &&
					metricNames.length > 0 &&
					responseData.map((datapoint, index) => {
						const isQueryDataItem = index < metricNames.length;
						const metricName = isQueryDataItem ? metricNames[index] : undefined;
						const metricUnit = isQueryDataItem ? metricUnits[index] : undefined;

						// Show the no unit warning if -
						// 1. The metric query is not loading
						// 2. The metric units are not loading
						// 3. There are more than one metric
						// 4. The current metric unit is empty
						// 5. Is a queryData item
						const isMetricUnitEmpty =
							isQueryDataItem &&
							!queries[index].isLoading &&
							!isMetricUnitsLoading &&
							metricUnits.length > 1 &&
							!metricUnit &&
							metricName;

						const currentYAxisUnit = yAxisUnit || metricUnit;

						return (
							<div
								className="time-series-view"
								// eslint-disable-next-line react/no-array-index-key
								key={index}
							>
								{isMetricUnitEmpty && metricName && (
									<Tooltip
										className="no-unit-warning"
										title={
											<Typography.Text>
												No unit is set for this metric. You can assign one from the{' '}
												<Typography.Link
													onClick={(): void => handleOpenMetricDetails(metricName)}
												>
													metric details
												</Typography.Link>{' '}
												page.
											</Typography.Text>
										}
									>
										<TriangleAlert
											size={16}
											color={Color.BG_AMBER_400}
											role="img"
											aria-label="no unit warning"
										/>
									</Tooltip>
								)}
								<TimeSeriesView
									isFilterApplied={false}
									isError={queries[index].isError}
									isLoading={queries[index].isLoading || isMetricUnitsLoading}
									data={datapoint}
									yAxisUnit={currentYAxisUnit}
									dataSource={DataSource.METRICS}
									error={queries[index].error as APIError}
									setWarning={setWarning}
								/>
							</div>
						);
					})}
			</div>
		</>
	);
}

export default TimeSeries;
