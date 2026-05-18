import { Tabs, Tooltip } from 'antd';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { Braces, Globe, Table } from '@signozhq/icons';
import { useAppContext } from 'providers/App/App';
import { USER_ROLES } from 'types/roles';

import { VariablesSettingsTabHandle } from '../DashboardDescription/types';
import DashboardVariableSettings from './DashboardVariableSettings';
import GeneralDashboardSettings from './General';
import PublicDashboardSetting from './PublicDashboard';

import './DashboardSettingsContent.styles.scss';
import { Button } from '@signozhq/ui/button';

function DashboardSettings({
	variablesSettingsTabHandle,
}: {
	variablesSettingsTabHandle: VariablesSettingsTabHandle;
}): JSX.Element {
	const { user } = useAppContext();
	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();

	const enablePublicDashboard = isCloudUser || isEnterpriseSelfHostedUser;

	const publicDashboardItem = {
		label: (
			<Tooltip
				title={
					user?.role !== USER_ROLES.ADMIN
						? 'Only admins can publish / manage public dashboards'
						: ''
				}
				placement="right"
			>
				<Button
					className={`public-dashboard-btn ${
						user?.role !== USER_ROLES.ADMIN ? 'disabled-btn' : ''
					}`}
					variant="ghost"
					prefix={<Globe size={14} />}
				>
					Publish
				</Button>
			</Tooltip>
		),
		key: 'public-dashboard',
		children: <PublicDashboardSetting />,
		disabled: user?.role !== USER_ROLES.ADMIN,
	};

	const items = [
		{
			label: (
				<Button
					className="overview-btn"
					variant="ghost"
					prefix={<Table size={14} />}
				>
					Overview
				</Button>
			),
			key: 'general',
			children: <GeneralDashboardSettings />,
		},
		{
			label: (
				<Button
					className="variables-btn"
					variant="ghost"
					prefix={<Braces size={14} />}
				>
					Variables
				</Button>
			),
			key: 'variables',
			children: (
				<DashboardVariableSettings
					variablesSettingsTabHandle={variablesSettingsTabHandle}
				/>
			),
		},
		...(enablePublicDashboard ? [publicDashboardItem] : []),
	];

	return <Tabs items={items} animated className="settings-tabs" />;
}

export default DashboardSettings;
