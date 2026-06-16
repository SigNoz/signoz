import { useMemo } from 'react';

import { Braces, Globe, Table } from '@signozhq/icons';
import {
	TabItemProps,
	TabsContent,
	TabsList,
	TabsRoot,
	TabsTrigger,
} from '@signozhq/ui/tabs';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import Overview from './Overview';
import PublicDashboardSettings from './PublicDashboard';
import VariablesSettings from './Variables';
import { useAppContext } from 'providers/App/App';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { USER_ROLES } from 'types/roles';

import styles from './DashboardSettings.module.scss';

interface DashboardSettingsProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
}

enum TabKeys {
	OVERVIEW = 'Overview',
	VARIABLES = 'Variables',
	PUBLISH = 'Publish',
}

const prefixIcons: Record<TabKeys, JSX.Element> = {
	[TabKeys.OVERVIEW]: <Table size={14} />,
	[TabKeys.VARIABLES]: <Braces size={14} />,
	[TabKeys.PUBLISH]: <Globe size={14} />,
};

function DashboardSettings({ dashboard }: DashboardSettingsProps): JSX.Element {
	const { user } = useAppContext();
	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();

	const enablePublicDashboard = isCloudUser || isEnterpriseSelfHostedUser;

	const items: TabItemProps[] = useMemo(
		() => [
			{
				key: TabKeys.OVERVIEW,
				label: TabKeys.OVERVIEW,
				children: <Overview dashboard={dashboard} />,
			},
			{
				key: TabKeys.VARIABLES,
				label: TabKeys.VARIABLES,
				children: <VariablesSettings dashboard={dashboard} />,
				prefixIcon: <Braces size={14} />,
			},
			...(enablePublicDashboard
				? [
						{
							key: TabKeys.PUBLISH,
							label: TabKeys.PUBLISH,
							children: <PublicDashboardSettings dashboard={dashboard} />,
							disabled: user?.role !== USER_ROLES.ADMIN,
						},
					]
				: []),
		],
		[enablePublicDashboard, dashboard, user?.role],
	);

	return (
		<TabsRoot defaultValue={TabKeys.OVERVIEW}>
			<TabsList variant="primary">
				{Object.values(TabKeys).map((key) => (
					<TabsTrigger value={key} key={key}>
						{prefixIcons[key]}
						{key}
					</TabsTrigger>
				))}
			</TabsList>

			{items.map((item) => (
				<TabsContent value={item.key} key={item.key} className={styles.tabsContent}>
					{item.children}
				</TabsContent>
			))}
		</TabsRoot>
	);
}

export default DashboardSettings;
