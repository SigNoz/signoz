import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import ExplorerPage from 'container/ApiMonitoring/Explorer/Explorer';
import { Compass } from 'lucide-react';

export const Explorer: TabRoutes = {
	Component: ExplorerPage,
	name: (
		<div className="tab-item">
			<Compass size={16} /> Explorer
		</div>
	),
	route: ROUTES.API_MONITORING,
	key: ROUTES.API_MONITORING,
};
