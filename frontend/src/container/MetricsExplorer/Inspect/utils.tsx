import { InfoCircleFilled } from '@ant-design/icons';
import { Input, Select, Typography } from 'antd';
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
	MetricFiltersProps,
	MetricNameSearchProps,
	MetricSpaceAggregationProps,
	MetricTimeAggregationProps,
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
}: MetricTimeAggregationProps): JSX.Element {
	return (
		<div className="metric-time-aggregation">
			<div className="metric-time-aggregation-header">
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
}: MetricSpaceAggregationProps): JSX.Element {
	return (
		<div className="metric-space-aggregation">
			<div className="metric-space-aggregation-header">
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
