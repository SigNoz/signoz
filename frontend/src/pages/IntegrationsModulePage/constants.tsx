import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { Compass } from 'lucide-react';
import InstalledIntegrations from 'pages/InstalledIntegrations';

export const installedIntegrations: TabRoutes = {
	Component: InstalledIntegrations,
	name: (
		<div className="tab-item">
			<Compass size={16} /> Integrations
		</div>
	),
	route: ROUTES.INTEGRATIONS_INSTALLED,
	key: ROUTES.INTEGRATIONS_INSTALLED,
};
