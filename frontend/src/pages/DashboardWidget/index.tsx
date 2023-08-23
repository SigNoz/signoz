import { Card, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import NewWidget from 'container/NewWidget';
import history from 'lib/history';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useEffect, useState } from 'react';
import { generatePath, useLocation } from 'react-router-dom';

function DashboardWidget(): JSX.Element {
	const { search } = useLocation();

	const [selectedGraph, setSelectedGraph] = useState<PANEL_TYPES>();
	const { selectedDashboard, dashboardId, dashboardResponse } = useDashboard();

	const params = new URLSearchParams(search);

	const widgetId = params.get('widgetId');
	const { data } = selectedDashboard || {};
	const { widgets } = data || {};

	const selectedWidget = widgets?.find((e) => e.id === widgetId);

	useEffect(() => {
		const params = new URLSearchParams(search);
		const graphType = params.get('graphType') as PANEL_TYPES | null;

		if (graphType === null) {
			history.push(generatePath(ROUTES.DASHBOARD, { dashboardId }));
		} else {
			setSelectedGraph(graphType);
		}
	}, [dashboardId, search]);

	if (
		selectedGraph === undefined ||
		dashboardResponse.isFetching ||
		selectedWidget === undefined
	) {
		return <Spinner tip="Loading.." />;
	}

	if (dashboardResponse.isError) {
		return (
			<Card>
				<Typography>Something went wrong</Typography>
			</Card>
		);
	}

	return (
		<NewWidget
			yAxisUnit={selectedWidget.yAxisUnit}
			selectedGraph={selectedGraph}
		/>
	);
}

export default DashboardWidget;
