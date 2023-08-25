import { PANEL_TYPES } from 'constants/queryBuilder';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback } from 'react';
import { Layout } from 'react-grid-layout';

import GraphLayoutContainer from './GridCardLayout';

function GridGraph(): JSX.Element {
	const {
		selectedDashboard,
		setLayouts,
		handleToggleDashboardSlider,
	} = useDashboard();

	const { data } = selectedDashboard || {};
	const { widgets } = data || {};

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

	return (
		<GraphLayoutContainer
			onAddPanelHandler={onEmptyWidgetHandler}
			widgets={widgets}
		/>
	);
}

export default GridGraph;
