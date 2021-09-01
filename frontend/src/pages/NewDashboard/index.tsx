import Spinner from 'components/Spinner';
import NewDashboard from 'container/NewDashboard';
import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetDashboard } from 'store/actions/dashboard';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Props } from 'types/api/dashboard/get';
import DashboardReducer from 'types/reducer/dashboards';

const NewDashboardPage = ({ getDashboard }: NewDashboardProps): JSX.Element => {
	const { loading, dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const { dashboardId } = useParams<Params>();

	useEffect(() => {
		getDashboard({
			uuid: dashboardId,
		});
	}, []);

	if (loading || dashboards.length === 0) {
		return <Spinner />;
	}

	return <NewDashboard />;
};

interface Params {
	dashboardId: string;
}

interface DispatchProps {
	getDashboard: ({ uuid }: Props) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getDashboard: bindActionCreators(GetDashboard, dispatch),
});

type NewDashboardProps = DispatchProps;

export default connect(null, mapDispatchToProps)(NewDashboardPage);
