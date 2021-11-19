import { Tabs } from 'antd';
import React, { useState } from 'react';

const { TabPane } = Tabs;
import AlertChannels from 'container/AlertChannels';
import GeneralSettings from 'container/GeneralSettings';

const SettingsPage = (): JSX.Element => {
	const [selectedTab, setSelectedTab] = useState<SettingTab>('Alert Channels');

	return (
		<Tabs
			onChange={(value): void => {
				setSelectedTab(value as SettingTab);
			}}
			activeKey={selectedTab}
		>
			<TabPane tab="General" key="General">
				<GeneralSettings />
			</TabPane>
			<TabPane tab="Alert Channels" key="Alert Channels">
				<AlertChannels />
			</TabPane>
			{/* <TabPane tab="Users" key="3">
				Users
			</TabPane> */}
		</Tabs>
	);
};

type SettingTab = 'General' | 'Alert Channels';

export default SettingsPage;
