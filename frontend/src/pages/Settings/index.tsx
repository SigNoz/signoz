import { Tabs } from 'antd';
import React, { useState } from 'react';

const { TabPane } = Tabs;
import GeneralSettings from 'container/GeneralSettings';
import AlertChannels from 'container/AlertChannels';

const SettingsPage = (): JSX.Element => {
	return (
		<Tabs defaultActiveKey="2">
			<TabPane tab="General" key="1">
				<GeneralSettings />
			</TabPane>
			<TabPane tab="Alert Channels" key="2">
				<AlertChannels />
			</TabPane>
			{/* <TabPane tab="Users" key="3">
				Users
			</TabPane> */}
		</Tabs>
	);
};

export default SettingsPage;
