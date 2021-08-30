import React, { useState } from 'react';
import RGL, { Layout, WidthProvider } from 'react-grid-layout';

import GraphComponent from '../GridGraph';
const ReactGridLayout = WidthProvider(RGL);
import { Card } from './styles';

const GridGraph = (): JSX.Element => {
	const [layouts, setLayout] = useState<LayoutProps[]>([
		{
			i: 'a',
			x: 0,
			y: 0,
			w: 4,
			h: 2,
			Component: GraphComponent,
		},
		{
			i: 'b',
			x: 4,
			y: 0,
			w: 4,
			h: 2,
			Component: GraphComponent,
		},
		{
			i: 'c',
			x: 8,
			y: 0,
			w: 4,
			h: 2,
			Component: GraphComponent,
		},
	]);

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
		>
			{layouts.map(({ Component, ...rest }) => {
				return (
					<div key={rest.i} data-grid={rest}>
						<Card>
							<Component />
						</Card>
					</div>
				);
			})}
		</ReactGridLayout>
	);
};

interface LayoutProps extends Layout {
	Component: () => JSX.Element;
}

export default GridGraph;
