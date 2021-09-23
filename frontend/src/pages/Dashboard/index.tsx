import Spinner from 'components/Spinner';
import ListOfAllDashboard from 'container/ListOfDashboard';
import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetAllDashboards } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import DashboardReducer from 'types/reducer/dashboards';

const Dashboard = ({ getAllDashboards }: DashboardProps): JSX.Element => {
	const { loading } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	useEffect(() => {
		getAllDashboards();
	}, [getAllDashboards]);

	if (loading) {
		return <Spinner size="large" tip="Loading.." />;
	}

	return <ListOfAllDashboard />;
};

interface DispatchProps {
	getAllDashboards: () => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getAllDashboards: bindActionCreators(GetAllDashboards, dispatch),
});

type DashboardProps = DispatchProps;

export default connect(null, mapDispatchToProps)(Dashboard);
