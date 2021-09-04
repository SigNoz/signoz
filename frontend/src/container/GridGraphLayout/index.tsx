import GraphComponent, {
	GridGraphComponentProps,
} from 'container/GridGraphComponent';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import React, { useCallback, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { useHistory, useLocation } from 'react-router-dom';
import { v4 } from 'uuid';

import { Card, ReactGridLayout } from './styles';

const GridGraph = (): JSX.Element => {
	const { push } = useHistory();
	const { pathname } = useLocation();

	const [layouts, setLayout] = useState<LayoutProps[]>([
		// {
		// 	i: 'a',
		// 	x: 0,
		// 	y: 0,
		// 	w: 4,
		// 	h: 2,
		// 	Component: GraphComponent,
		// },
		// {
		// 	i: 'b',
		// 	x: 4,
		// 	y: 0,
		// 	w: 4,
		// 	h: 2,
		// 	Component: GraphComponent,
		// },
		// {
		// 	i: 'c',
		// 	x: 8,
		// 	y: 0,
		// 	w: 4,
		// 	h: 2,
		// 	Component: GraphComponent,
		// },
	]);

	const onDropHandler = useCallback(
		(allLayouts: Layout[], currectLayout: Layout, event: DragEvent) => {
			event.preventDefault();
			if (event.dataTransfer) {
				const graphType = event.dataTransfer.getData('text') as GRAPH_TYPES;
				const generateWidgetId = v4();
				push(`${pathname}/new?graphType=${graphType}&widgetId=${generateWidgetId}`);
			}
		},
		[],
	);

	return (
		<ReactGridLayout
			isResizable
			isDraggable
			rowHeight={100}
			autoSize
			width={100}
			isDroppable
			useCSSTransforms
			resizeHandles={['se', 'ne']}
			isBounded
			onDrop={onDropHandler}
		>
			{layouts.map(({ Component, GraphTypes, ...rest }) => {
				return (
					<div key={rest.i} data-grid={rest}>
						<Card>
							<Component GRAPH_TYPES={GraphTypes} />
						</Card>
					</div>
				);
			})}
		</ReactGridLayout>
	);
};

interface LayoutProps extends Layout {
	Component: ({
		GRAPH_TYPES,
		data,
	}: GridGraphComponentProps) => JSX.Element | null;
	GraphTypes: GRAPH_TYPES;
}

export default GridGraph;
