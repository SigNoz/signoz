import './ThresholdSelector.styles.scss';

import { Button, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { Events } from 'constants/events';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { useCallback, useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { eventEmitter } from 'utils/getEventEmitter';
import { v4 as uuid } from 'uuid';

import Threshold from './Threshold';
import { ThresholdSelectorProps } from './types';

function ThresholdSelector({
	thresholds,
	setThresholds,
	yAxisUnit,
	selectedGraph,
}: ThresholdSelectorProps): JSX.Element {
	const [tableOptions, setTableOptions] = useState<
		Array<{ value: string; label: string }>
	>([]);
	useEffect(() => {
		eventEmitter.on(
			Events.TABLE_COLUMNS_DATA,
			(data: { columns: ColumnsType<RowData>; dataSource: RowData[] }) => {
				const newTableOptions = data.columns.map((e) => ({
					value: e.title as string,
					label: e.title as string,
				}));
				setTableOptions([...newTableOptions]);
			},
		);
	}, []);

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
				thresholdUnit: yAxisUnit,
				thresholdValue: 0,
				moveThreshold,
				keyIndex: thresholds.length,
				selectedGraph,
				thresholdTableOptions: tableOptions[0]?.value || '',
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
						selectedGraph={selectedGraph}
						thresholdLabel={threshold.thresholdLabel}
						tableOptions={tableOptions}
						thresholdTableOptions={threshold.thresholdTableOptions}
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
