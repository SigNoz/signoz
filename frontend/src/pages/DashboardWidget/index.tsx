import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { generatePath, useParams } from 'react-router-dom';
import { Card, Typography } from 'antd';
import getDashboard from 'api/v1/dashboards/id/get';
import Spinner from 'components/Spinner';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DASHBOARD_CACHE_TIME } from 'constants/queryCacheTime';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import NewWidget from 'container/NewWidget';
import { isDrilldownEnabled } from 'container/QueryTable/Drilldown/drilldownUtils';
import { useTransformDashboardVariables } from 'hooks/dashboard/useTransformDashboardVariables';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { setDashboardVariablesStore } from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStore';
import { Dashboard } from 'types/api/dashboard/getAll';

function DashboardWidget(): JSX.Element | null {
	const { dashboardId } = useParams<{
		dashboardId: string;
	}>();
	const query = useUrlQuery();
	const { graphType, widgetId } = useMemo(() => {
		return {
			graphType: query.get(QueryParams.graphType) as PANEL_TYPES,
			widgetId: query.get(QueryParams.widgetId),
		};
	}, [query]);

	const { safeNavigate } = useSafeNavigate();

	useEffect(() => {
		if (!graphType || !widgetId) {
			safeNavigate(generatePath(ROUTES.DASHBOARD, { dashboardId }));
		} else if (!dashboardId) {
			safeNavigate(ROUTES.HOME);
		}
	}, [graphType, widgetId, dashboardId, safeNavigate]);

	if (!widgetId || !graphType) {
		return null;
	}

	return (
		<DashboardWidgetInternal
			dashboardId={dashboardId}
			widgetId={widgetId}
			graphType={graphType}
		/>
	);
}

function DashboardWidgetInternal({
	dashboardId,
	widgetId,
	graphType,
}: {
	dashboardId: string;
	widgetId: string;
	graphType: PANEL_TYPES;
}): JSX.Element | null {
	const [dashboardData, setDashboardData] = useState<Dashboard | undefined>(
		undefined,
	);

	const { transformDashboardVariables } = useTransformDashboardVariables(
		dashboardId,
	);

	const {
		isFetching: isFetchingDashboardResponse,
		isError: isErrorDashboardResponse,
	} = useQuery([REACT_QUERY_KEY.DASHBOARD_BY_ID, dashboardId, widgetId], {
		enabled: true,
		queryFn: async () =>
			await getDashboard({
				id: dashboardId,
			}),
		refetchOnWindowFocus: false,
		cacheTime: DASHBOARD_CACHE_TIME,
		onSuccess: (response) => {
			const updatedDashboardData = transformDashboardVariables(response.data);
			setDashboardData(updatedDashboardData);
			setDashboardVariablesStore({
				dashboardId,
				variables: updatedDashboardData.data.variables,
			});
		},
	});

	if (isFetchingDashboardResponse) {
		return <Spinner tip="Loading.." />;
	}

	if (isErrorDashboardResponse) {
		return (
			<Card>
				<Typography>{SOMETHING_WENT_WRONG}</Typography>
			</Card>
		);
	}

	return (
		<NewWidget
			dashboardId={dashboardId}
			selectedGraph={graphType}
			enableDrillDown={isDrilldownEnabled()}
			dashboardData={dashboardData}
		/>
	);
}
export default DashboardWidget;
