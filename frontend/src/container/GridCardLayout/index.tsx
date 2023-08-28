import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback } from 'react';
import { Layout } from 'react-grid-layout';

import { EMPTY_WIDGET_LAYOUT } from './config';
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
			EMPTY_WIDGET_LAYOUT,
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
