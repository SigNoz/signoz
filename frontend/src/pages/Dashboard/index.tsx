import { Space } from 'antd';
import ReleaseNote from 'components/ReleaseNote';
import ListOfAllDashboard from 'container/ListOfDashboard';
import { useLocation } from 'react-router-dom';

function Dashboard(): JSX.Element {
	const location = useLocation();

	return (
		<Space direction="vertical" size="middle" style={{ width: '100%' }}>
			<ReleaseNote path={location.pathname} />
			<ListOfAllDashboard />
		</Space>
	);
}

export default Dashboard;
