import './DashboardsListPage.styles.scss';

import { Space, Typography } from 'antd';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import ListOfAllDashboard from 'container/ListOfDashboard';
import { LayoutGrid } from 'lucide-react';

function DashboardsListPage(): JSX.Element {
	return (
		<Space
			direction="vertical"
			size="middle"
			style={{ width: '100%' }}
			className="dashboard-list-page"
		>
			<div className="dashboard-header">
				<div className="dashboard-header-left">
					<LayoutGrid size={14} className="icon" />
					<Typography.Text className="text">Dashboards</Typography.Text>
				</div>

				<HeaderRightSection
					enableAnnouncements={false}
					enableShare
					enableFeedback
				/>
			</div>
			<ListOfAllDashboard />
		</Space>
	);
}

export default DashboardsListPage;
