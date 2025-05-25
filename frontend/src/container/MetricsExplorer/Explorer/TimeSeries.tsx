import { Color } from '@signozhq/design-tokens';
import { Tooltip } from 'antd';
import classNames from 'classnames';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { convertDataValueToMs } from 'container/TimeSeriesView/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQueries } from 'react-query';
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

	return (
		<>
			<div className="y-axis-unit-selector-container">
				<YAxisUnitSelector
					value={yAxisUnit}
					onChange={onUnitChangeHandler}
					loading={isMetricUnitsLoading}
					disabled={isMetricUnitsLoading || isMetricUnitsError}
				/>
			</div>
			<div
				className={classNames({
					'time-series-container': changeLayoutForOneChartPerQuery,
				})}
			>
				{responseData.map((datapoint, index) => {
					const isMetricUnitEmpty =
						!isMetricUnitsLoading &&
						metricUnits.length > 0 &&
						metricUnits[index] === '';

					console.log({ isMetricUnitsLoading, metricUnits });

					return (
						<div
							className="time-series-view"
							// eslint-disable-next-line react/no-array-index-key
							key={index}
						>
							{isMetricUnitEmpty && (
								<Tooltip
									className="no-unit-warning"
									title="This metric does not have a unit. Please set a unit for it in the details drawer."
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
							/>
						</div>
					);
				})}
			</div>
		</>
	);
}

export default TimeSeries;
