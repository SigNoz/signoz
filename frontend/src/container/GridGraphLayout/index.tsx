/* eslint-disable react/display-name */
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import DashboardReducer from 'types/reducer/dashboards';
import { v4 } from 'uuid';

import AddWidget from './AddWidget';
import Graph from './Graph';
import { Card, ReactGridLayout } from './styles';

const GridGraph = ({ onToggleHandler }: Props): JSX.Element => {
	const { push } = useHistory();
	const { pathname } = useLocation();

	const AddWidgetWrapper = (): JSX.Element => (
		<AddWidget onToggleHandler={onToggleHandler} />
	);

	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const [selectedDashboard] = dashboards;
	const { data } = selectedDashboard;
	const { widgets } = data;

	const [layouts, setLayout] = useState<LayoutProps[]>([
		{
			i: '0',
			x: 0,
			y: 0,
			w: 6,
			h: 2,
			Component: AddWidgetWrapper,
		},
	]);

	const counter = useRef(0);

	useEffect(() => {
		if (counter.current === 0) {
			const getPreLayouts = (): LayoutProps[] => {
				if (widgets === undefined) {
					return [];
				}

				return widgets?.map((e, index) => {
					return {
						h: 2,
						w: 6,
						y: Infinity,
						i: (index + 1).toString(),
						x: (index + 1 * 6) % 12,
						Component: (): JSX.Element => <Graph widgets={widgets[index]} />,
					};
				});
			};

			const preLayouts = getPreLayouts();

			counter.current = 1;
			setLayout((pre) => [...pre, ...preLayouts]);
		}
	}, [widgets, layouts.length]);

	const onDropHandler = useCallback(
		(allLayouts: Layout[], currectLayout: Layout, event: DragEvent) => {
			event.preventDefault();
			if (event.dataTransfer) {
				const graphType = event.dataTransfer.getData('text') as GRAPH_TYPES;
				const generateWidgetId = v4();
				push(`${pathname}/new?graphType=${graphType}&widgetId=${generateWidgetId}`);
			}
		},
		[pathname, push],
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

interface Props {
	onToggleHandler: () => void;
}

export default GridGraph;
