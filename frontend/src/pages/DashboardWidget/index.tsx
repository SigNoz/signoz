import { Card, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import NewWidget from 'container/NewWidget';
import history from 'lib/history';
import { useEffect, useRef, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { generatePath, useLocation, useParams } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetDashboard, GetDashboardProps } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import DashboardReducer from 'types/reducer/dashboards';

function DashboardWidget({ getDashboard }: NewDashboardProps): JSX.Element {
	const { search } = useLocation();
	const { dashboardId } = useParams<DashboardWidgetPageParams>();

	const [selectedGraph, setSelectedGraph] = useState<PANEL_TYPES>();
	const { loading, dashboards, error, errorMessage } = useSelector<
		AppState,
		DashboardReducer
	>((state) => state.dashboards);
	const [selectedDashboard] = dashboards;
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

	const counter = useRef(0);

	useEffect(() => {
		if (counter.current === 0 && selectedGraph && widgetId !== null) {
			counter.current = 1;
			getDashboard({
				uuid: dashboardId,
				graphType: selectedGraph,
				widgetId,
			});
		}
	}, [selectedGraph, dashboardId, getDashboard, search, widgetId]);

	if (
		selectedGraph === undefined ||
		loading ||
		dashboards.length === 0 ||
		dashboards[0].data.widgets === undefined ||
		selectedWidget === undefined
	) {
		return <Spinner tip="Loading.." />;
	}

	if (error) {
		return (
			<Card>
				<Typography>{errorMessage}</Typography>
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

export interface DashboardWidgetPageParams {
	dashboardId: string;
}

interface DispatchProps {
	getDashboard: ({
		uuid,
		widgetId,
		graphType,
	}: GetDashboardProps) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getDashboard: bindActionCreators(GetDashboard, dispatch),
});

type NewDashboardProps = DispatchProps;

export default connect(null, mapDispatchToProps)(DashboardWidget);
