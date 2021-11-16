import { Tabs } from 'antd';
import React from 'react';

const { TabPane } = Tabs;
import GeneralSettings from 'container/GeneralSettings';

const SettingsPage = (): JSX.Element => {
	return (
		<Tabs defaultActiveKey="1">
			<TabPane tab="General" key="1">
				<GeneralSettings />
			</TabPane>
			{/* <TabPane tab="Alert Channels" key="2">
				Alerts
			</TabPane>
			<TabPane tab="Users" key="3">
				Users
			</TabPane> */}
		</Tabs>
	);
};

export default SettingsPage;
