import { useMemo } from 'react';

import { Braces, Globe, Table } from '@signozhq/icons';
import { TabItemProps, Tabs } from '@signozhq/ui/tabs';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import GeneralSettings from './General';
import { SettingsTabPlaceholder } from './utils';
import VariablesSettings from './Variables';

interface DashboardSettingsProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
}

function DashboardSettings({ dashboard }: DashboardSettingsProps): JSX.Element {
	const items: TabItemProps[] = useMemo(
		() => [
			{
				key: 'general',
				label: 'General',
				children: <GeneralSettings dashboard={dashboard} />,
				prefixIcon: <Table size={14} />,
			},
			{
				key: 'variables',
				label: 'Variables',
				children: <VariablesSettings dashboard={dashboard} />,
				prefixIcon: <Braces size={14} />,
			},
			{
				key: 'public-dashboard',
				label: 'Publish',
				children: (
					<SettingsTabPlaceholder message="V2 public dashboard publishing coming next." />
				),
				prefixIcon: <Globe size={14} />,
			},
		],
		[dashboard],
	);

	return <Tabs defaultValue="general" items={items} />;
}

export default DashboardSettings;
