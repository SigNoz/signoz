import { useMemo } from 'react';
import { useQueries } from 'react-query';
import { useSelector } from 'react-redux';
import { Color } from '@signozhq/design-tokens';
import { Tooltip, Typography } from 'antd';
import { isAxiosError } from 'axios';
import classNames from 'classnames';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { convertDataValueToMs } from 'container/TimeSeriesView/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { AlertTriangle } from 'lucide-react';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import APIError from 'types/api/error';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { TimeSeriesProps } from './types';
import { splitQueryIntoOneChartPerQuery } from './utils';

function TimeSeries({
	showOneChartPerQuery,
	setWarning,
	isMetricUnitsLoading,
	metricUnits,
	metricNames,
	handleOpenMetricDetails,
	yAxisUnit,
	setYAxisUnit,
	showYAxisUnitSelector,
}: TimeSeriesProps): JSX.Element {
	const { stagedQuery, currentQuery } = useQueryBuilder();

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
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
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
				),
			enabled: !!payload,
			retry: (failureCount: number, error: Error): boolean => {
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
		})),
	);

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

	// TODO: Enable once we have resolved all related metrics v2 api issues
	// Show the save unit button if
	// 1. There is only one metric
	// 2. The metric has no saved unit
	// 3. The user has selected a unit
	// const showSaveUnitButton = useMemo(
	// 	() =>
	// 		metricUnits.length === 1 &&
	// 		Boolean(metrics?.[0]) &&
	// 		!metricUnits[0] &&
	// 		yAxisUnit,
	// 	[metricUnits, metrics, yAxisUnit],
	// );

	// const {
	// 	mutate: updateMetricMetadata,
	// 	isLoading: isUpdatingMetricMetadata,
	// } = useUpdateMetricMetadata();

	// const handleSaveUnit = (): void => {
	// 	updateMetricMetadata(
	// 		{
	// 			metricName: metricNames[0],
	// 			payload: {
	// 				unit: yAxisUnit,
	// 				description: metrics[0]?.description ?? '',
	// 				metricType: metrics[0]?.type as MetricType,
	// 				temporality: metrics[0]?.temporality,
	// 			},
	// 		},
	// 		{
	// 			onSuccess: () => {
	// 				notifications.success({
	// 					message: 'Unit saved successfully',
	// 				});
	// 				queryClient.invalidateQueries([
	// 					REACT_QUERY_KEY.GET_METRIC_DETAILS,
	// 					metricNames[0],
	// 				]);
	// 			},
	// 			onError: () => {
	// 				notifications.error({
	// 					message: 'Failed to save unit',
	// 				});
	// 			},
	// 		},
	// 	);
	// };

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
						{/* TODO: Enable once we have resolved all related metrics v2 api issues */}
						{/* {showSaveUnitButton && (
							<div className="save-unit-container">
								<Typography.Text>
									Save the selected unit for this metric?
								</Typography.Text>
								<Button
									type="primary"
									size="small"
									disabled={isUpdatingMetricMetadata}
									onClick={handleSaveUnit}
								>
									<Typography.Paragraph>Yes</Typography.Paragraph>
								</Button>
							</div>
						)} */}
					</>
				)}
			</div>
			<div
				className={classNames({
					'time-series-container': changeLayoutForOneChartPerQuery,
				})}
			>
				{responseData.map((datapoint, index) => {
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
											This metric does not have a unit. Please set one for it in the{' '}
											<Typography.Link
												onClick={(): void => handleOpenMetricDetails(metricName)}
											>
												metric details
											</Typography.Link>{' '}
											page.
										</Typography.Text>
									}
								>
									<AlertTriangle size={16} color={Color.BG_AMBER_400} />
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
