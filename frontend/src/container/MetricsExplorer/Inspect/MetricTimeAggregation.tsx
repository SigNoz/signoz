import { Input, Typography } from 'antd';
import { Select } from 'antd';
import classNames from 'classnames';

import { TIME_AGGREGATION_OPTIONS } from './constants';
import { InspectionStep } from './types';
import { MetricTimeAggregationProps } from './types';
import { getDefaultTimeAggregationInterval } from './utils';

function MetricTimeAggregation({
	currentMetricInspectionOptions,
	dispatchMetricInspectionOptions,
	inspectionStep,
	inspectMetricsTimeSeries,
}: MetricTimeAggregationProps): JSX.Element {
	return (
		<div
			data-testid="metric-time-aggregation"
			className="metric-time-aggregation"
		>
			<div
				className={classNames('metric-time-aggregation-header', {
					'selected-step': inspectionStep === InspectionStep.TIME_AGGREGATION,
				})}
			>
				<Typography.Text>AGGREGATE BY TIME</Typography.Text>
			</div>
			<div className="metric-time-aggregation-content">
				<div className="inspect-metrics-input-group">
					<Typography.Text>Align with</Typography.Text>
					<Select
						value={currentMetricInspectionOptions.timeAggregationOption}
						onChange={(value): void => {
							dispatchMetricInspectionOptions({
								type: 'SET_TIME_AGGREGATION_OPTION',
								payload: value,
							});
							// set the time aggregation interval to the default value if it is not set
							if (!currentMetricInspectionOptions.timeAggregationInterval) {
								dispatchMetricInspectionOptions({
									type: 'SET_TIME_AGGREGATION_INTERVAL',
									payload: getDefaultTimeAggregationInterval(
										inspectMetricsTimeSeries[0],
									),
								});
							}
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
						value={currentMetricInspectionOptions.timeAggregationInterval}
						placeholder="Select interval..."
						suffix="seconds"
						onChange={(e): void => {
							dispatchMetricInspectionOptions({
								type: 'SET_TIME_AGGREGATION_INTERVAL',
								payload: parseInt(e.target.value, 10),
							});
						}}
						onWheel={(e): void => (e.target as HTMLInputElement).blur()}
					/>
				</div>
			</div>
		</div>
	);
}

export default MetricTimeAggregation;
