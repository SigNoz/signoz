import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import DashboardSettings from '../../DashboardSettings';
import SettingsDrawer from '../../DashboardPageToolbar/SettingsDrawer';
import { useDashboardStore } from '../../store/useDashboardStore';

interface DashboardSettingsDrawerProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
}

/**
 * Opens on any `requestSettings` in the tree. Mounted by the container, so it
 * works whichever controls a host hides.
 */
function DashboardSettingsDrawer({
	dashboard,
}: DashboardSettingsDrawerProps): JSX.Element {
	const settingsRequest = useDashboardStore((s) => s.settingsRequest);
	const clearSettingsRequest = useDashboardStore((s) => s.clearSettingsRequest);

	return (
		<SettingsDrawer
			drawerTitle="Dashboard Configuration"
			isOpen={!!settingsRequest}
			destroyOnClose
			onClose={clearSettingsRequest}
		>
			<DashboardSettings dashboard={dashboard} />
		</SettingsDrawer>
	);
}

export default DashboardSettingsDrawer;
