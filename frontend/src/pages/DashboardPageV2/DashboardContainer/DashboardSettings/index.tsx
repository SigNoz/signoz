import { useMemo } from 'react';

import { Braces, Globe, Table } from '@signozhq/icons';
import { Tabs } from '@signozhq/ui/tabs';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import GeneralSettings from './General';
import { SettingsTabPlaceholder } from './utils';

import styles from './DashboardSettings.module.scss';

interface DashboardSettingsProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
}

function tabLabel(icon: JSX.Element, text: string): JSX.Element {
	return (
		<span className={styles.tabLabel}>
			{icon}
			{text}
		</span>
	);
}

function DashboardSettings({ dashboard }: DashboardSettingsProps): JSX.Element {
	const items = useMemo(
		() => [
			{
				key: 'general',
				label: tabLabel(<Table size={14} />, 'General'),
				children: <GeneralSettings dashboard={dashboard} />,
			},
			{
				key: 'variables',
				label: tabLabel(<Braces size={14} />, 'Variables'),
				children: (
					<SettingsTabPlaceholder message="V2 dashboard variables coming next." />
				),
			},
			{
				key: 'public-dashboard',
				label: tabLabel(<Globe size={14} />, 'Publish'),
				children: (
					<SettingsTabPlaceholder message="V2 public dashboard publishing coming next." />
				),
			},
		],
		[dashboard],
	);

	return <Tabs defaultValue="general" items={items} />;
}

export default DashboardSettings;
