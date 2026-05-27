import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import classNames from 'classnames';

import { SPACE_AGGREGATION_OPTIONS } from './constants';
import {
	InspectionStep,
	MetricSpaceAggregationProps,
	SpaceAggregationOptions,
} from './types';

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
					<SelectSimple
						value={currentMetricInspectionOptions.spaceAggregationOption}
						placeholder="Select option"
						onChange={(value): void => {
							if (Array.isArray(value)) {
								return;
							}
							dispatchMetricInspectionOptions({
								type: 'SET_SPACE_AGGREGATION_OPTION',
								payload: value as SpaceAggregationOptions,
							});
						}}
						style={{ width: 130 }}
						disabled={inspectionStep === InspectionStep.TIME_AGGREGATION}
						items={Object.entries(SPACE_AGGREGATION_OPTIONS).map(([key, value]) => ({
							value: key,
							label: value,
						}))}
					/>
				</div>
				<SelectSimple
					multiple
					style={{ width: '100%' }}
					placeholder="Search for attributes..."
					value={currentMetricInspectionOptions.spaceAggregationLabels}
					onChange={(value): void => {
						dispatchMetricInspectionOptions({
							type: 'SET_SPACE_AGGREGATION_LABELS',
							payload: value as string[],
						});
					}}
					disabled={inspectionStep === InspectionStep.TIME_AGGREGATION}
					items={spaceAggregationLabels.map((label) => ({
						value: label,
						label,
					}))}
				/>
			</div>
		</div>
	);
}

export default MetricSpaceAggregation;
