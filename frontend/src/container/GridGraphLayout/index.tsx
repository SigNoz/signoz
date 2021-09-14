import Spinner from 'components/Spinner';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import DashboardReducer from 'types/reducer/dashboards';
import { v4 } from 'uuid';

import AddWidget from './AddWidget';
import Graph from './Graph';
import { Card, ReactGridLayout } from './styles';

const GridGraph = (): JSX.Element => {
	const { push } = useHistory();
	const { pathname } = useLocation();

	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const [selectedDashboard] = dashboards;
	const { data } = selectedDashboard;
	const { widgets } = data;

	const [layouts, setLayout] = useState<LayoutProps[]>([]);

	const AddWidgetWrapper = useCallback(() => <AddWidget />, []);

	useEffect(() => {
		const getPreLayouts = (): LayoutProps[] => {
			if (widgets === undefined) {
				return [];
			}

			return widgets.map((e, index) => {
				return {
					h: 2,
					w: 6,
					y: Infinity,
					i: (index + 1).toString(),
					x: (index * 6) % 12,
					// eslint-disable-next-line react/display-name
					Component: (): JSX.Element => <Graph widget={widgets[index]} />,
				};
			});
		};

		const preLayouts = getPreLayouts();

		setLayout(() => [
			...preLayouts,
			{
				i: Infinity.toString(),
				x: ((widgets || []).length * 6) % 12,
				y: Infinity,
				w: 6,
				h: 2,
				Component: AddWidgetWrapper,
			},
		]);
	}, [widgets, layouts.length, AddWidgetWrapper]);

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

	if (layouts.length === 0) {
		return <Spinner height="40vh" size="large" tip="Loading..." />;
	}

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

export default memo(GridGraph);
