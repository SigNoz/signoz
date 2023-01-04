import { Tabs } from 'antd';
import React from 'react';

import GeneralDashboardSettings from './General';
import VariablesSetting from './Variables';

const { TabPane } = Tabs;

function DashboardSettingsContent(): JSX.Element {
	return (
		<Tabs>
			<TabPane tab="General" key="general">
				<GeneralDashboardSettings />
			</TabPane>
			<TabPane tab="Variables" key="variables">
				<VariablesSetting />
			</TabPane>
		</Tabs>
	);
}

export default DashboardSettingsContent;
