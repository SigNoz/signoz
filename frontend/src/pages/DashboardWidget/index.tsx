import { Card, Typography } from 'antd';
import Spinner from 'components/Spinner';
import ROUTES from 'constants/routes';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import NewWidget from 'container/NewWidget';
import updateUrl from 'lib/updateUrl';
import React, { useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetDashboard } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Props as GetDashboardProps } from 'types/api/dashboard/get';
import DashboardReducer from 'types/reducer/dashboards';

const DashboardWidget = ({ getDashboard }: NewDashboardProps): JSX.Element => {
	const { search } = useLocation();
	const { dashboardId } = useParams<Params>();

	const { push } = useHistory();
	const [selectedGraph, setSelectedGraph] = useState<GRAPH_TYPES>();
	const { loading, dashboards, error, errorMessage } = useSelector<
		AppState,
		DashboardReducer
	>((state) => state.dashboards);

	useEffect(() => {
		const params = new URLSearchParams(search);
		const graphType = params.get('graphType') as GRAPH_TYPES | null;

		if (graphType === null) {
			push(updateUrl(ROUTES.DASHBOARD, ':dashboardId', dashboardId));
		} else {
			setSelectedGraph(graphType);
		}
	}, []);

	useEffect(() => {
		getDashboard({
			uuid: dashboardId,
		});
	}, []);

	if (selectedGraph === undefined || loading || dashboards.length === 0) {
		return <Spinner tip="Loading.." />;
	}

	if (error) {
		return (
			<Card>
				<Typography>{errorMessage}</Typography>
			</Card>
		);
	}

	return <NewWidget selectedGraph={selectedGraph} />;
};

interface Params {
	dashboardId: string;
	widgetId: string;
}

interface DispatchProps {
	getDashboard: ({
		uuid,
	}: GetDashboardProps) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getDashboard: bindActionCreators(GetDashboard, dispatch),
});

type NewDashboardProps = DispatchProps;

export default connect(null, mapDispatchToProps)(DashboardWidget);
