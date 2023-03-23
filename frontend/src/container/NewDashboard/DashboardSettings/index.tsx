import { Tabs } from 'antd';
import React from 'react';

import GeneralDashboardSettings from './General';
import VariablesSetting from './Variables';

function DashboardSettingsContent(): JSX.Element {
	const items = [
		{ label: 'General', key: 'general', children: <GeneralDashboardSettings /> },
		{ label: 'Variables', key: 'variables', children: <VariablesSetting /> },
	];

	return <Tabs items={items} />;
}

export default DashboardSettingsContent;
