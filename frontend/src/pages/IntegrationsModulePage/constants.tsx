import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { Compass } from 'lucide-react';
import Integrations from 'pages/Integrations';

export const installedIntegrations: TabRoutes = {
	Component: Integrations,
	name: (
		<div className="tab-item">
			<Compass size={16} /> Integrations
		</div>
	),
	route: ROUTES.INTEGRATIONS,
	key: ROUTES.INTEGRATIONS,
};
