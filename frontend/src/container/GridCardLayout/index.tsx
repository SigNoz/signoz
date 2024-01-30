import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback } from 'react';

import GraphLayoutContainer from './GridCardLayout';

function GridGraph(): JSX.Element {
	const { handleToggleDashboardSlider } = useDashboard();

	const onEmptyWidgetHandler = useCallback(() => {
		handleToggleDashboardSlider(true);
	}, [handleToggleDashboardSlider]);

	return <GraphLayoutContainer onAddPanelHandler={onEmptyWidgetHandler} />;
}

export default GridGraph;
