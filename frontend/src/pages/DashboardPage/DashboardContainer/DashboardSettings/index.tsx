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
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';

import { useDashboardStore } from '../store/useDashboardStore';
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
	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();
	// Opened once per drawer mount (the drawer destroys on close); a deep-link
	// request lands us on the right tab.
	const settingsRequest = useDashboardStore((s) => s.settingsRequest);

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
			// Readable by anyone who can open the dashboard; the controls inside
			// gate on update.
			...(enablePublicDashboard
				? [
						{
							key: TabKeys.PUBLISH,
							label: TabKeys.PUBLISH,
							children: <PublicDashboardSettings dashboard={dashboard} />,
						},
					]
				: []),
		],
		[enablePublicDashboard, dashboard],
	);

	return (
		<TabsRoot defaultValue={settingsRequest?.tab ?? TabKeys.OVERVIEW}>
			<TabsList variant="primary">
				{items.map((item) => (
					<TabsTrigger value={item.key} key={item.key} disabled={item.disabled}>
						{prefixIcons[item.key as TabKeys]}
						{item.label}
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
