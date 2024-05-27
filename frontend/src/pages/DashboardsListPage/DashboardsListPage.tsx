import './DashboardsListPage.styles.scss';

import { Space, Typography } from 'antd';
import ReleaseNote from 'components/ReleaseNote';
import ListOfAllDashboard from 'container/ListOfDashboard';
import { LayoutGrid } from 'lucide-react';
import { useLocation } from 'react-router-dom';

function DashboardsListPage(): JSX.Element {
	const location = useLocation();

	return (
		<Space
			direction="vertical"
			size="middle"
			style={{ width: '100%' }}
			className="dashboard-list-page"
		>
			<ReleaseNote path={location.pathname} />
			<div className="dashboard-header">
				<LayoutGrid size={14} className="icon" />
				<Typography.Text className="text">Dashboards</Typography.Text>
			</div>
			<ListOfAllDashboard />
		</Space>
	);
}

export default DashboardsListPage;
