import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { Compass, TowerControl } from 'lucide-react';
import SaveView from 'pages/SaveView';
import TracesExplorer from 'pages/TracesExplorer';

export const tracesExplorer: TabRoutes = {
	Component: TracesExplorer,
	name: (
		<div className="tab-item">
			<Compass size={16} /> Explorer
		</div>
	),
	route: ROUTES.TRACES_EXPLORER,
	key: ROUTES.TRACES_EXPLORER,
};

export const tracesSaveView: TabRoutes = {
	Component: SaveView,
	name: (
		<div className="tab-item">
			<TowerControl size={16} /> Views
		</div>
	),
	route: ROUTES.TRACES_SAVE_VIEWS,
	key: ROUTES.TRACES_SAVE_VIEWS,
};
