/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './ThresholdSelector.styles.scss';

import { Typography } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Antenna, Plus } from 'lucide-react';
import { useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import Threshold from './Threshold';
import { ThresholdSelectorProps } from './types';

function ThresholdSelector({
	thresholds,
	setThresholds,
	yAxisUnit,
	selectedGraph,
	columnUnits,
}: ThresholdSelectorProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();

	function getAggregateColumnsNamesAndLabels(): string[] {
		if (currentQuery.queryType === EQueryType.QUERY_BUILDER) {
			const queries = currentQuery.builder.queryData.map((q) => q.queryName);
			const formulas = currentQuery.builder.queryFormulas.map((q) => q.queryName);
			return [...queries, ...formulas];
		}
		if (currentQuery.queryType === EQueryType.CLICKHOUSE) {
			return currentQuery.clickhouse_sql.map((q) => q.name);
		}
		return currentQuery.promql.map((q) => q.name);
	}

	const aggregationQueries = getAggregateColumnsNamesAndLabels();

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
				thresholdTableOptions: aggregationQueries[0] || '',
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
					<div className="left-section">
						<Antenna size={14} className="icon" />
						<Typography.Text className="text">Thresholds</Typography.Text>
					</div>
					<Plus size={14} onClick={addThresholdHandler} className="icon" />
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
						tableOptions={aggregationQueries.map((query) => ({
							value: query,
							label: query,
						}))}
						thresholdTableOptions={threshold.thresholdTableOptions}
						columnUnits={columnUnits}
					/>
				))}
			</div>
		</DndProvider>
	);
}

export default ThresholdSelector;
