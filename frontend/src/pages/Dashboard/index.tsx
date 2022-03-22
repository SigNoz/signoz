import ListOfAllDashboard from 'container/ListOfDashboard';
import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetAllDashboards } from 'store/actions';
import AppActions from 'types/actions';

function Dashboard({ getAllDashboards }: DashboardProps): JSX.Element {
	useEffect(() => {
		getAllDashboards();
	}, [getAllDashboards]);

	return <ListOfAllDashboard />;
}

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
