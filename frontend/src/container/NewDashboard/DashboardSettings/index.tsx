import { Tabs } from 'antd';
import React from 'react';
import GeneralDashboardSettings from './General';
import VariablesSetting from './Variables';

const { TabPane } = Tabs;

const onChange = (key) => {
	console.log(key);
};

function DashboardSettingsContent() {
	return (
		<Tabs onChange={onChange}>
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
