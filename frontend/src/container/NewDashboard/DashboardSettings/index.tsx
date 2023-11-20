import { Tabs } from 'antd';

import GeneralDashboardSettings from './General';
import VariablesSetting from './Variables';

const items = [
	{ label: 'General', key: 'general', children: <GeneralDashboardSettings /> },
	{ label: 'Variables', key: 'variables', children: <VariablesSetting /> },
];

function DashboardSettingsContent(): JSX.Element {
	return <Tabs items={items} />;
}

export default DashboardSettingsContent;
