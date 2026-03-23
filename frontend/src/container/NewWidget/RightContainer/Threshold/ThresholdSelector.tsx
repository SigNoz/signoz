import { useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetQueryLabels } from 'hooks/useGetQueryLabels';
import { Plus } from 'lucide-react';
import { v4 as uuid } from 'uuid';

import Threshold from './Threshold';
import { ThresholdSelectorProps } from './types';

import './ThresholdSelector.styles.scss';

function ThresholdSelector({
	thresholds,
	setThresholds,
	yAxisUnit,
	selectedGraph,
	columnUnits,
}: ThresholdSelectorProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();

	const aggregationQueries = useGetQueryLabels(currentQuery);

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
			{
				index: uuid(),
				isEditEnabled: true,
				thresholdColor: 'Red',
				thresholdFormat: 'Text',
				thresholdOperator: '>',
				thresholdUnit: yAxisUnit,
				thresholdValue: 0,
				moveThreshold,
				keyIndex: thresholds.length,
				selectedGraph,
				thresholdTableOptions: aggregationQueries[0]?.value || '',
			},
			...thresholds,
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
				<div className="threshold-select" onClick={addThresholdHandler}>
					<Button
						type="default"
						icon={<Plus size={14} />}
						style={{ width: '100%' }}
						onClick={addThresholdHandler}
					>
						Add Threshold
					</Button>
				</div>
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
						selectedGraph={selectedGraph}
						thresholdLabel={threshold.thresholdLabel}
						tableOptions={aggregationQueries}
						thresholdTableOptions={threshold.thresholdTableOptions}
						columnUnits={columnUnits}
						yAxisUnit={yAxisUnit}
					/>
				))}
			</div>
		</DndProvider>
	);
}

export default ThresholdSelector;
