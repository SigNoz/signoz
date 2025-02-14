import { Card, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import NewWidget from 'container/NewWidget';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useEffect, useState } from 'react';
import { generatePath, useLocation, useParams } from 'react-router-dom';
import { Widgets } from 'types/api/dashboard/getAll';

function DashboardWidget(): JSX.Element | null {
	const { search } = useLocation();
	const { dashboardId } = useParams<DashboardWidgetPageParams>();
	const { safeNavigate } = useSafeNavigate();

	const [selectedGraph, setSelectedGraph] = useState<PANEL_TYPES>();

	const { selectedDashboard, dashboardResponse } = useDashboard();

	const params = useUrlQuery();

	const widgetId = params.get('widgetId');
	const { data } = selectedDashboard || {};
	const { widgets } = data || {};

	const selectedWidget = widgets?.find((e) => e.id === widgetId) as Widgets;

	useEffect(() => {
		const params = new URLSearchParams(search);
		const graphType = params.get('graphType') as PANEL_TYPES | null;

		if (graphType === null) {
			safeNavigate(generatePath(ROUTES.DASHBOARD, { dashboardId }));
		} else {
			setSelectedGraph(graphType);
		}
	}, [dashboardId, safeNavigate, search]);

	if (selectedGraph === undefined || dashboardResponse.isLoading) {
		return <Spinner tip="Loading.." />;
	}

	if (dashboardResponse.isError) {
		return (
			<Card>
				<Typography>{SOMETHING_WENT_WRONG}</Typography>
			</Card>
		);
	}

	return (
		<NewWidget
			yAxisUnit={selectedWidget?.yAxisUnit}
			selectedGraph={selectedGraph}
			fillSpans={selectedWidget?.fillSpans}
		/>
	);
}

export interface DashboardWidgetPageParams {
	dashboardId: string;
}

export default DashboardWidget;
