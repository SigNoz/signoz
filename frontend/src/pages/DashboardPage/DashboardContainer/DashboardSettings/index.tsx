import { CSSProperties, useMemo } from 'react';

import { Braces, Globe, Table } from '@signozhq/icons';
import { Tabs, TabsItemProps } from '@signozhq/ui/tabs';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import Overview from './Overview';
import PublicDashboardSettings from './PublicDashboard';
import VariablesSettings from './Variables';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';

import { useDashboardStore } from '../store/useDashboardStore';

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

	const items: TabsItemProps[] = useMemo(() => {
		const next: TabsItemProps[] = [
			{
				key: TabKeys.OVERVIEW,
				label: TabKeys.OVERVIEW,
				prefixIcon: prefixIcons[TabKeys.OVERVIEW],
				children: <Overview dashboard={dashboard} />,
			},
			{
				key: TabKeys.VARIABLES,
				label: TabKeys.VARIABLES,
				prefixIcon: prefixIcons[TabKeys.VARIABLES],
				children: <VariablesSettings dashboard={dashboard} />,
			},
		];

		// Readable by anyone who can open the dashboard; the controls inside
		// gate on update.
		if (enablePublicDashboard) {
			next.push({
				key: TabKeys.PUBLISH,
				label: TabKeys.PUBLISH,
				prefixIcon: prefixIcons[TabKeys.PUBLISH],
				children: <PublicDashboardSettings dashboard={dashboard} />,
			});
		}

		return next;
	}, [enablePublicDashboard, dashboard]);

	return (
		<Tabs
			variant="primary"
			orientation="horizontal"
			alignment="start"
			defaultValue={settingsRequest?.tab ?? TabKeys.OVERVIEW}
			style={
				{
					'--tabs-content-padding': 'var(--spacing-4) 0',
				} as CSSProperties
			}
			items={items}
		/>
	);
}

export default DashboardSettings;
