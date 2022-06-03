import Spinner from 'components/Spinner';
import NewDashboard from 'container/NewDashboard';
import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetDashboard, GetDashboardProps } from 'store/actions/dashboard';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import DashboardReducer from 'types/reducer/dashboards';

function NewDashboardPage({ getDashboard }: NewDashboardProps): JSX.Element {
	const { loading, dashboards, error, errorMessage } = useSelector<
		AppState,
		DashboardReducer
	>((state) => state.dashboards);

	const { dashboardId } = useParams<Params>();

	useEffect(() => {
		if (dashboards.length !== 1) {
			getDashboard({
				uuid: dashboardId,
			});
		}
	}, [getDashboard, dashboardId, dashboards.length]);

	if (error && !loading && dashboards.length === 0) {
		return <div>{errorMessage}</div>;
	}

	// when user comes from dashboard page. dashboard array is populated with some dashboard as dashboard is populated
	// so to avoid any unmount call dashboard must have length zero
	if (loading || dashboards.length === 0 || dashboards.length !== 1) {
		return <Spinner tip="Loading.." />;
	}

	return <NewDashboard />;
}

interface Params {
	dashboardId: string;
}

interface DispatchProps {
	getDashboard: (
		props: GetDashboardProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getDashboard: bindActionCreators(GetDashboard, dispatch),
});

type NewDashboardProps = DispatchProps;

export default connect(null, mapDispatchToProps)(NewDashboardPage);
