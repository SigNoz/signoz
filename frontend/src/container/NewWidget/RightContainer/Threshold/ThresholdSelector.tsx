import './ThresholdSelector.styles.scss';

import { Button, Typography } from 'antd';
import { useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { v4 as uuid } from 'uuid';

import Threshold from './Threshold';
import { ThresholdSelectorProps } from './types';

function ThresholdSelector({
	thresholds,
	setThresholds,
}: ThresholdSelectorProps): JSX.Element {
	const moveThreshold = useCallback(
		(dragIndex: number, hoverIndex: number) => {
			setThresholds((prevCards) => {
				const draggedCard = prevCards[dragIndex];
				const remainingCards = prevCards.filter((_, index) => index !== dragIndex);
				return [
					...remainingCards.slice(0, hoverIndex),
					draggedCard,
					...remainingCards.slice(hoverIndex),
				];
			});
		},
		[setThresholds],
	);

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
				moveThreshold,
				keyIndex: thresholds.length,
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
		<DndProvider backend={HTML5Backend}>
			<div className="threshold-selector-container">
				<Typography.Text>Thresholds</Typography.Text>
				{thresholds.map((threshold, idx) => (
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
						setThresholds={setThresholds}
						keyIndex={idx}
						moveThreshold={moveThreshold}
					/>
				))}
				<Button className="threshold-selector-button" onClick={addThresholdHandler}>
					+ Add threshold
				</Button>
			</div>
		</DndProvider>
	);
}

export default ThresholdSelector;
