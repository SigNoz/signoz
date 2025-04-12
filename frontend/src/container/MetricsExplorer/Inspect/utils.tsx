import { InfoCircleFilled } from '@ant-design/icons';
import { Input, Select, Typography } from 'antd';
import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';
import classNames from 'classnames';
import { initialQueriesMap } from 'constants/queryBuilder';
import { AggregatorFilter } from 'container/QueryBuilder/filters';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import { useMemo, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import {
	INSPECT_FEATURE_FLAG_KEY,
	SPACE_AGGREGATION_OPTIONS,
	TIME_AGGREGATION_OPTIONS,
} from './constants';
import {
	InspectionStep,
	MetricFiltersProps,
	MetricInspectionOptions,
	MetricNameSearchProps,
	MetricSpaceAggregationProps,
	MetricTimeAggregationProps,
	SpaceAggregationOptions,
	TimeAggregationOptions,
} from './types';

/**
 * Check if the inspect feature flag is enabled
 * returns true if the feature flag is enabled, false otherwise
 * Show the inspect button in  metrics explorer if the feature flag is enabled
 */
export function isInspectEnabled(): boolean {
	const featureFlag = localStorage.getItem(INSPECT_FEATURE_FLAG_KEY);
	return featureFlag === 'true';
}

export function MetricNameSearch({
	metricName,
	setMetricName,
}: MetricNameSearchProps): JSX.Element {
	const [searchText, setSearchText] = useState(metricName);

	const handleSetMetricName = (value: BaseAutocompleteData): void => {
		setMetricName(value.key);
	};

	const handleChange = (value: BaseAutocompleteData): void => {
		setSearchText(value.key);
	};

	return (
		<div className="inspect-metrics-input-group metric-name-search">
			<Typography.Text>From</Typography.Text>
			<AggregatorFilter
				defaultValue={searchText ?? ''}
				query={initialQueriesMap[DataSource.METRICS].builder.queryData[0]}
				onSelect={handleSetMetricName}
				onChange={handleChange}
			/>
		</div>
	);
}

export function MetricFilters({
	metricName,
	metricType,
	dispatchMetricInspectionOptions,
}: MetricFiltersProps): JSX.Element {
	const query = useMemo(() => {
		const initialQuery =
			initialQueriesMap[DataSource.METRICS].builder.queryData[0];
		return {
			...initialQuery,
			aggregateAttribute: {
				...initialQuery.aggregateAttribute,
				key: metricName ?? '',
				id: metricName ?? '',
				isColumn: true,
				isJSON: false,
				type: metricType ?? '',
			},
		};
	}, [metricName, metricType]);

	return (
		<div className="inspect-metrics-input-group metric-filters">
			<Typography.Text>Where</Typography.Text>
			<QueryBuilderSearchV2
				onChange={(value): void => {
					dispatchMetricInspectionOptions({
						type: 'SET_FILTERS',
						payload: value,
					});
				}}
				query={query}
			/>
		</div>
	);
}

export function MetricTimeAggregation({
	metricInspectionOptions,
	dispatchMetricInspectionOptions,
	inspectionStep,
}: MetricTimeAggregationProps): JSX.Element {
	return (
		<div className="metric-time-aggregation">
			<div
				className={classNames('metric-time-aggregation-header', {
					'selected-step': inspectionStep === InspectionStep.TIME_AGGREGATION,
				})}
			>
				<Typography.Text>AGGREGATE BY TIME</Typography.Text>
				<InfoCircleFilled />
			</div>
			<div className="metric-time-aggregation-content">
				<div className="inspect-metrics-input-group">
					<Typography.Text>Align with</Typography.Text>
					<Select
						value={metricInspectionOptions.timeAggregationOption}
						onChange={(value): void => {
							dispatchMetricInspectionOptions({
								type: 'SET_TIME_AGGREGATION_OPTION',
								payload: value,
							});
						}}
						style={{ width: 130 }}
						placeholder="Select option"
					>
						{Object.entries(TIME_AGGREGATION_OPTIONS).map(([key, value]) => (
							<Select.Option key={key} value={key}>
								{value}
							</Select.Option>
						))}
					</Select>
				</div>
				<div className="inspect-metrics-input-group">
					<Typography.Text>aggregated every</Typography.Text>
					<Input
						type="number"
						className="no-arrows-input"
						value={metricInspectionOptions.timeAggregationInterval}
						placeholder="Select interval..."
						suffix="seconds"
						onChange={(e): void => {
							dispatchMetricInspectionOptions({
								type: 'SET_TIME_AGGREGATION_INTERVAL',
								payload: parseInt(e.target.value, 10),
							});
						}}
					/>
				</div>
			</div>
		</div>
	);
}

export function MetricSpaceAggregation({
	spaceAggregationLabels,
	metricInspectionOptions,
	dispatchMetricInspectionOptions,
	inspectionStep,
}: MetricSpaceAggregationProps): JSX.Element {
	return (
		<div className="metric-space-aggregation">
			<div
				className={classNames('metric-space-aggregation-header', {
					'selected-step': inspectionStep === InspectionStep.SPACE_AGGREGATION,
				})}
			>
				<Typography.Text>AGGREGATE BY LABELS</Typography.Text>
				<InfoCircleFilled />
			</div>
			<div className="metric-space-aggregation-content">
				<div className="metric-space-aggregation-content-left">
					<Select
						value={metricInspectionOptions.spaceAggregationOption}
						placeholder="Select option"
						onChange={(value): void => {
							dispatchMetricInspectionOptions({
								type: 'SET_SPACE_AGGREGATION_OPTION',
								payload: value,
							});
						}}
						style={{ width: 130 }}
					>
						{/* eslint-disable-next-line sonarjs/no-identical-functions */}
						{Object.entries(SPACE_AGGREGATION_OPTIONS).map(([key, value]) => (
							<Select.Option key={key} value={key}>
								{value}
							</Select.Option>
						))}
					</Select>
				</div>
				<Select
					mode="multiple"
					style={{ width: '100%' }}
					placeholder="Search for attributes..."
					value={metricInspectionOptions.spaceAggregationLabels}
					onChange={(value): void => {
						dispatchMetricInspectionOptions({
							type: 'SET_SPACE_AGGREGATION_LABELS',
							payload: value,
						});
					}}
				>
					{spaceAggregationLabels.map((label) => (
						<Select.Option key={label} value={label}>
							{label}
						</Select.Option>
					))}
				</Select>
			</div>
		</div>
	);
}

export function applyTimeAggregation(
	inspectMetricsTimeSeries: InspectMetricsSeries[],
	metricInspectionOptions: MetricInspectionOptions,
): InspectMetricsSeries[] {
	const {
		timeAggregationOption,
		timeAggregationInterval,
	} = metricInspectionOptions;

	if (!timeAggregationInterval) {
		return inspectMetricsTimeSeries;
	}

	// Group timestamps into intervals
	const groupedTimestamps = new Map<number, number[]>();
	inspectMetricsTimeSeries.forEach((series) => {
		series.values.forEach(({ timestamp, value }) => {
			// Find which interval bucket this timestamp belongs to
			const intervalBucket =
				Math.floor(timestamp / (timeAggregationInterval * 1000)) *
				(timeAggregationInterval * 1000);

			if (!groupedTimestamps.has(intervalBucket)) {
				groupedTimestamps.set(intervalBucket, []);
			}
			groupedTimestamps.get(intervalBucket)?.push(parseFloat(value));
		});
	});

	// Convert Map to array of [timestamp, values] pairs for iteration
	const timeIntervals = Array.from(groupedTimestamps.entries());

	// Apply aggregation based on selected option
	const aggregatedSeries = inspectMetricsTimeSeries.map((series) => {
		const aggregatedValues = timeIntervals.map(([intervalStart, values]) => {
			let aggregatedValue: number;

			switch (timeAggregationOption) {
				case TimeAggregationOptions.LATEST:
					aggregatedValue = values[values.length - 1];
					break;
				case TimeAggregationOptions.SUM:
					aggregatedValue = values.reduce((sum, val) => sum + val, 0);
					break;
				case TimeAggregationOptions.AVG:
					aggregatedValue =
						values.reduce((sum, val) => sum + val, 0) / values.length;
					break;
				case TimeAggregationOptions.MIN:
					aggregatedValue = Math.min(...values);
					break;
				case TimeAggregationOptions.MAX:
					aggregatedValue = Math.max(...values);
					break;
				case TimeAggregationOptions.COUNT:
					aggregatedValue = values.length;
					break;
				default:
					aggregatedValue = values[values.length - 1];
			}

			return {
				timestamp: intervalStart,
				value: aggregatedValue.toString(),
			};
		});

		return {
			...series,
			values: aggregatedValues,
		};
	});

	// Update the inspectMetricsTimeSeries with aggregated data
	inspectMetricsTimeSeries.splice(
		0,
		inspectMetricsTimeSeries.length,
		...aggregatedSeries,
	);

	return inspectMetricsTimeSeries;
}

export function applySpaceAggregation(
	inspectMetricsTimeSeries: InspectMetricsSeries[],
	metricInspectionOptions: MetricInspectionOptions,
): InspectMetricsSeries[] {
	// Group series by selected space aggregation labels
	const groupedSeries = new Map<string, InspectMetricsSeries[]>();

	inspectMetricsTimeSeries.forEach((series) => {
		// Create composite key from selected labels
		const key = metricInspectionOptions.spaceAggregationLabels
			.map((label) => `${label}:${series.labels[label]}`)
			.join(',');

		if (!groupedSeries.has(key)) {
			groupedSeries.set(key, []);
		}
		groupedSeries.get(key)?.push(series);
	});

	// Aggregate each group based on space aggregation option
	const aggregatedSeries: InspectMetricsSeries[] = [];

	groupedSeries.forEach((seriesGroup) => {
		// Get the first series to use as template for labels and timestamps
		const templateSeries = seriesGroup[0];

		// Create a map of timestamp to array of values across all series in group
		const timestampValuesMap = new Map<number, number[]>();

		// Collect values for each timestamp across all series
		seriesGroup.forEach((series) => {
			series.values.forEach(({ timestamp, value }) => {
				if (!timestampValuesMap.has(timestamp)) {
					timestampValuesMap.set(timestamp, []);
				}
				timestampValuesMap.get(timestamp)?.push(parseFloat(value));
			});
		});

		// Aggregate values based on selected space aggregation option
		const aggregatedValues = Array.from(timestampValuesMap.entries()).map(
			([timestamp, values]) => {
				let aggregatedValue: number;

				switch (metricInspectionOptions.spaceAggregationOption) {
					case SpaceAggregationOptions.SUM_BY:
						aggregatedValue = values.reduce((sum, val) => sum + val, 0);
						break;
					case SpaceAggregationOptions.AVG_BY:
						aggregatedValue =
							values.reduce((sum, val) => sum + val, 0) / values.length;
						break;
					case SpaceAggregationOptions.MIN_BY:
						aggregatedValue = Math.min(...values);
						break;
					case SpaceAggregationOptions.MAX_BY:
						aggregatedValue = Math.max(...values);
						break;
					default:
						// eslint-disable-next-line prefer-destructuring
						aggregatedValue = values[0];
				}

				return {
					timestamp,
					value: (aggregatedValue || 0).toString(),
				};
			},
		);

		// Create aggregated series with original labels
		aggregatedSeries.push({
			...templateSeries,
			values: aggregatedValues.sort((a, b) => a.timestamp - b.timestamp),
		});
	});

	return aggregatedSeries;
}
