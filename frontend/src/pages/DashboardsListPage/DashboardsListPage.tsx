import './DashboardsListPage.styles.scss';

import { Space, Typography } from 'antd';
import ListOfAllDashboard from 'container/ListOfDashboard';
import { LayoutGrid } from 'lucide-react';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import React from 'react';

function DashboardsListPage(): JSX.Element {
	return (
		<PreferenceContextProvider>
			<Space
				direction="vertical"
				size="middle"
				style={{ width: '100%' }}
				className="dashboard-list-page"
			>
				<div className="dashboard-header">
					<LayoutGrid size={14} className="icon" />
					<Typography.Text className="text">Dashboards</Typography.Text>
				</div>
				<ListOfAllDashboard />
			</Space>
		</PreferenceContextProvider>
	);
}

export default DashboardsListPage;
