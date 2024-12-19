import './DashboardSettingsContent.styles.scss';

import { Button, Tabs } from 'antd';
import { Braces, Table } from 'lucide-react';

import GeneralDashboardSettings from './General';
import VariablesSetting from './Variables';

function DashboardSettingsContent({
	variableViewModeRef,
}: {
	variableViewModeRef: React.MutableRefObject<(() => void) | undefined>;
}): JSX.Element {
	const items = [
		{
			label: (
				<Button type="text" icon={<Table size="14" />} className="overview-btn">
					Overview
				</Button>
			),
			key: 'general',
			children: <GeneralDashboardSettings />,
		},
		{
			label: (
				<Button type="text" icon={<Braces size={14} />} className="variables-btn">
					Variables
				</Button>
			),
			key: 'variables',
			children: <VariablesSetting variableViewModeRef={variableViewModeRef} />,
		},
	];

	return <Tabs items={items} animated className="settings-tabs" />;
}

export default DashboardSettingsContent;
