import { PANEL_TYPES } from 'constants/queryBuilder';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback } from 'react';
import { Layout } from 'react-grid-layout';

import GraphLayoutContainer from './GridCardLayout';

function GridGraph(): JSX.Element {
	const { selectedDashboard, layouts, setLayouts } = useDashboard();

	const { data } = selectedDashboard || {};
	const { widgets } = data || {};

	const { handleToggleDashboardSlider } = useDashboard();

	const onEmptyWidgetHandler = useCallback(() => {
		handleToggleDashboardSlider(true);

		setLayouts((preLayout: Layout[]) => [
			{
				i: PANEL_TYPES.EMPTY_WIDGET,
				w: 6,
				x: 0,
				h: 2,
				y: 0,
			},
			...(preLayout || []),
		]);
	}, [handleToggleDashboardSlider, setLayouts]);

	console.log({ layouts });

	return (
		<GraphLayoutContainer
			layouts={layouts}
			onAddPanelHandler={onEmptyWidgetHandler}
			widgets={widgets}
		/>
	);
}

export default GridGraph;
