import { Typography } from 'antd';
import { Select } from 'antd';
import classNames from 'classnames';

import { SPACE_AGGREGATION_OPTIONS } from './constants';
import { InspectionStep } from './types';
import { MetricSpaceAggregationProps } from './types';

function MetricSpaceAggregation({
	spaceAggregationLabels,
	currentMetricInspectionOptions,
	dispatchMetricInspectionOptions,
	inspectionStep,
}: MetricSpaceAggregationProps): JSX.Element {
	return (
		<div
			data-testid="metric-space-aggregation"
			className="metric-space-aggregation"
		>
			<div
				className={classNames('metric-space-aggregation-header', {
					'selected-step': inspectionStep === InspectionStep.SPACE_AGGREGATION,
				})}
			>
				<Typography.Text>AGGREGATE BY LABELS</Typography.Text>
			</div>
			<div className="metric-space-aggregation-content">
				<div className="metric-space-aggregation-content-left">
					<Select
						value={currentMetricInspectionOptions.spaceAggregationOption}
						placeholder="Select option"
						onChange={(value): void => {
							dispatchMetricInspectionOptions({
								type: 'SET_SPACE_AGGREGATION_OPTION',
								payload: value,
							});
						}}
						style={{ width: 130 }}
						disabled={inspectionStep === InspectionStep.TIME_AGGREGATION}
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
					value={currentMetricInspectionOptions.spaceAggregationLabels}
					onChange={(value): void => {
						dispatchMetricInspectionOptions({
							type: 'SET_SPACE_AGGREGATION_LABELS',
							payload: value,
						});
					}}
					disabled={inspectionStep === InspectionStep.TIME_AGGREGATION}
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

export default MetricSpaceAggregation;
