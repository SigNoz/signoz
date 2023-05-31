import { Space } from 'antd';
import ReleaseNote from 'components/ReleaseNote';
import ListOfAllDashboard from 'container/ListOfDashboard';
import { useEffect } from 'react';
import { connect } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetAllDashboards } from 'store/actions';
import AppActions from 'types/actions';

function Dashboard({ getAllDashboards }: DashboardProps): JSX.Element {
	const location = useLocation();
	useEffect(() => {
		getAllDashboards();
	}, [getAllDashboards]);

	return (
		<Space direction="vertical" size="middle" style={{ width: '100%' }}>
			<ReleaseNote path={location.pathname} />
			<ListOfAllDashboard />
		</Space>
	);
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
