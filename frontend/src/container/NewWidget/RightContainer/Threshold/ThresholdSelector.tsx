import './ThresholdSelector.styles.scss';

import { Button, Typography } from 'antd';
import { v4 as uuid } from 'uuid';

import Threshold from './Threshold';
import { ThresholdSelectorProps } from './types';

function ThresholdSelector({
	thresholds,
	setThresholds,
	selectedGraph,
}: ThresholdSelectorProps): JSX.Element {
	const addThresholdHandler = (): void => {
		setThresholds([
			...thresholds,
			{
				index: uuid(),
				isEditEnabled: true,
				thresholdColor: 'Red',
				thresholdFormat: 'Text',
				thresholdOperator: '>',
				thresholdUnit: 'ms',
				thresholdValue: 0,
				selectedGraph,
			},
		]);
	};

	const deleteThresholdHandler = (index: string): void => {
		const newThresholds = thresholds.filter(
			(threshold) => threshold.index !== index,
		);
		setThresholds(newThresholds);
	};

	return (
		<div className="threshold-selector-container">
			<Typography.Text>Thresholds</Typography.Text>
			{thresholds.map((threshold) => (
				<Threshold
					key={threshold.index}
					index={threshold.index}
					isEditEnabled={threshold.isEditEnabled}
					thresholdColor={threshold.thresholdColor}
					thresholdFormat={threshold.thresholdFormat}
					thresholdOperator={threshold.thresholdOperator}
					thresholdUnit={threshold.thresholdUnit}
					thresholdValue={threshold.thresholdValue}
					thresholdDeleteHandler={deleteThresholdHandler}
					thresholdLabel={threshold.thresholdLabel}
					setThresholds={setThresholds}
					selectedGraph={selectedGraph}
				/>
			))}
			<Button className="threshold-selector-button" onClick={addThresholdHandler}>
				+ Add threshold
			</Button>
		</div>
	);
}

export default ThresholdSelector;
