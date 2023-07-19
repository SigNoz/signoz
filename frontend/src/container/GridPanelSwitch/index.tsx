import Graph from 'components/Graph';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GridValueComponent from 'container/GridValueComponent';
import { memo } from 'react';

import { GridPanelSwitchProps } from './types';

function GridPanelSwitch({
	GRAPH_TYPES,
	data,
	title,
	opacity,
	isStacked,
	onClickHandler,
	name,
	yAxisUnit,
	staticLine,
	onDragSelect,
}: GridPanelSwitchProps): JSX.Element | null {
	switch (GRAPH_TYPES) {
		case PANEL_TYPES.TIME_SERIES: {
			return (
				<Graph
					// eslint-disable-next-line react/jsx-props-no-spreading
					{...{
						type: 'line',
						data,
						opacity,
						isStacked,
						onClickHandler,
						name,
						yAxisUnit,
						staticLine,
						onDragSelect,
					}}
				/>
			);
		}

		case PANEL_TYPES.VALUE: {
			return (
				<GridValueComponent title={title} yAxisUnit={yAxisUnit} data={data} />
			);
		}

		case PANEL_TYPES.TABLE: {
			return null;
		}

		default: {
			return null;
		}
	}
}

export default memo(GridPanelSwitch);
