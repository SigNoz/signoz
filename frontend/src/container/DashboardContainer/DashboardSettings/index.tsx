import { Tabs, TabItemProps } from '@signozhq/ui/tabs';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { Braces, Globe, Table } from '@signozhq/icons';
import { useAppContext } from 'providers/App/App';
import { USER_ROLES } from 'types/roles';

import { VariablesSettingsTabHandle } from '../DashboardDescription/types';
import DashboardVariableSettings from './DashboardVariableSettings';
import GeneralDashboardSettings from './General';
import PublicDashboardSetting from './PublicDashboard';

function DashboardSettings({
	variablesSettingsTabHandle,
}: {
	variablesSettingsTabHandle: VariablesSettingsTabHandle;
}): JSX.Element {
	const { user } = useAppContext();
	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();

	const enablePublicDashboard = isCloudUser || isEnterpriseSelfHostedUser;

	const publicDashboardItem: TabItemProps = {
		key: 'public-dashboard',
		label: 'Publish',
		prefixIcon: <Globe size={14} />,
		children: <PublicDashboardSetting />,
		disabled: user?.role !== USER_ROLES.ADMIN,
		disabledReason: 'Only admins can publish / manage public dashboards',
	};

	const items: TabItemProps[] = [
		{
			key: 'general',
			label: 'Overview',
			prefixIcon: <Table size={14} />,
			children: <GeneralDashboardSettings />,
		},
		{
			key: 'variables',
			label: 'Variables',
			prefixIcon: <Braces size={14} />,
			children: (
				<DashboardVariableSettings
					variablesSettingsTabHandle={variablesSettingsTabHandle}
				/>
			),
		},
		...(enablePublicDashboard ? [publicDashboardItem] : []),
	];

	return <Tabs items={items} />;
}

export default DashboardSettings;
