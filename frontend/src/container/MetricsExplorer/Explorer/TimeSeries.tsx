import { Color } from '@signozhq/design-tokens';
import { Button, Tooltip, Typography } from 'antd';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import classNames from 'classnames';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { convertDataValueToMs } from 'container/TimeSeriesView/utils';
import { useUpdateMetricMetadata } from 'hooks/metricsExplorer/useUpdateMetricMetadata';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useNotifications } from 'hooks/useNotifications';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { TimeSeriesProps } from './types';
import { splitQueryIntoOneChartPerQuery } from './utils';

function TimeSeries({
	showOneChartPerQuery,
	areAllMetricUnitsSame,
	isMetricUnitsLoading,
	isMetricUnitsError,
	metricUnits,
	metricNames,
	metrics,
	setIsMetricDetailsOpen,
}: TimeSeriesProps): JSX.Element {
	const { stagedQuery, currentQuery } = useQueryBuilder();
	const { notifications } = useNotifications();
	const queryClient = useQueryClient();

	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const isValidToConvertToMs = useMemo(() => {
		const isValid: boolean[] = [];

		currentQuery.builder.queryData.forEach(
			({ aggregateAttribute, aggregateOperator }) => {
				const isExistDurationNanoAttribute =
					aggregateAttribute.key === 'durationNano' ||
					aggregateAttribute.key === 'duration_nano';

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
				  )
				: [stagedQuery || initialQueriesMap[DataSource.METRICS]],
		[showOneChartPerQuery, stagedQuery],
	);

	const [yAxisUnit, setYAxisUnit] = useState<string>('');

	useEffect(() => {
		if (metricUnits.length === 0) {
			setYAxisUnit('');
			return;
		}
		if (metricUnits.length === 1) {
			setYAxisUnit(metricUnits[0]);
			return;
		}
		if (areAllMetricUnitsSame) {
			setYAxisUnit(metricUnits[0]);
			return;
		}
		setYAxisUnit('');
	}, [metricUnits, areAllMetricUnitsSame]);

	const queries = useQueries(
		queryPayloads.map((payload, index) => ({
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				payload,
				ENTITY_VERSION_V4,
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
					ENTITY_VERSION_V4,
				),
			enabled: !!payload,
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

	const goToMetricDetails = (): void => {
		setIsMetricDetailsOpen(true);
	};

	const showYAxisUnitSelector = useMemo(() => {
		if (metricUnits.length <= 1) {
			return true;
		}
		if (areAllMetricUnitsSame) {
			return metricUnits[0] !== '';
		}
		return false;
	}, [metricUnits, areAllMetricUnitsSame]);

	const showSaveUnitButton = useMemo(
		() =>
			metricUnits.length === 1 &&
			Boolean(metrics?.[0]) &&
			metricUnits[0] === '' &&
			yAxisUnit !== '',
		[metricUnits, metrics, yAxisUnit],
	);

	const {
		mutate: updateMetricMetadata,
		isLoading: isUpdatingMetricMetadata,
	} = useUpdateMetricMetadata();

	const handleSaveUnit = (): void => {
		updateMetricMetadata(
			{
				metricName: metricNames[0],
				payload: {
					unit: yAxisUnit,
					description: metrics[0]?.metadata?.description ?? '',
					metricType: metrics[0]?.metadata?.metric_type as MetricType,
				},
			},
			{
				onSuccess: () => {
					notifications.success({
						message: 'Unit saved successfully',
					});
					queryClient.invalidateQueries([
						REACT_QUERY_KEY.GET_METRIC_DETAILS,
						metricNames[0],
					]);
				},
				onError: () => {
					notifications.error({
						message: 'Failed to save unit',
					});
				},
			},
		);
	};

	return (
		<>
			<div className="y-axis-unit-selector-container">
				{showYAxisUnitSelector && (
					<>
						<YAxisUnitSelector
							value={yAxisUnit}
							onChange={onUnitChangeHandler}
							loading={isMetricUnitsLoading}
							disabled={isMetricUnitsLoading || isMetricUnitsError}
						/>
						{showSaveUnitButton && (
							<div className="save-unit-container">
								<Typography.Text>
									Save the selected unit for this metric?
								</Typography.Text>
								<Button
									type="primary"
									size="small"
									loading={isUpdatingMetricMetadata}
									onClick={handleSaveUnit}
								>
									Yes
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
				{responseData.map((datapoint, index) => {
					const isMetricUnitEmpty =
						!queries[index].isLoading &&
						!isMetricUnitsLoading &&
						metricUnits.length > 1 &&
						metricUnits[index] === '';

					return (
						<div
							className="time-series-view"
							// eslint-disable-next-line react/no-array-index-key
							key={index}
						>
							{isMetricUnitEmpty && (
								<Tooltip
									className="no-unit-warning"
									title={
										<Typography.Text>
											This metric does not have a unit. Please set one for it in the{' '}
											<Typography.Link onClick={goToMetricDetails}>
												metric details
											</Typography.Link>{' '}
											drawer.
										</Typography.Text>
									}
								>
									<AlertTriangle size={16} color={Color.BG_AMBER_400} />
								</Tooltip>
							)}
							<TimeSeriesView
								isFilterApplied={false}
								isError={queries[index].isError}
								isLoading={queries[index].isLoading}
								data={datapoint}
								yAxisUnit={yAxisUnit}
								dataSource={DataSource.METRICS}
								usingUniversalUnits
							/>
						</div>
					);
				})}
			</div>
		</>
	);
}

export default TimeSeries;
