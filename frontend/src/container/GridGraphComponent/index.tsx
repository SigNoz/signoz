import Graph from 'components/Graph';
import { memo } from 'react';

import { GridGraphComponentProps } from './types';

function GridGraphComponent({
	data,
	title,
	opacity,
	isStacked,
	onClickHandler,
	name,
	yAxisUnit,
	staticLine,
	onDragSelect,
}: GridGraphComponentProps): JSX.Element {
	return (
		<Graph
			{...{
				data,
				title,
				type: 'line',
				isStacked,
				opacity,
				xAxisType: 'time',
				onClickHandler,
				name,
				yAxisUnit,
				staticLine,
				onDragSelect,
			}}
		/>
	);
}

export default memo(GridGraphComponent);
