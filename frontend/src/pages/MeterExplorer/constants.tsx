import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import ExplorerPage from 'container/MeterExplorer/Explorer';
import { Compass, TowerControl } from 'lucide-react';
import SaveView from 'pages/SaveView';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';

export const Explorer: TabRoutes = {
	Component: (): JSX.Element => (
		<PreferenceContextProvider>
			<ExplorerPage />
		</PreferenceContextProvider>
	),
	name: (
		<div className="tab-item">
			<Compass size={16} /> Explorer
		</div>
	),
	route: ROUTES.METER_EXPLORER,
	key: ROUTES.METER_EXPLORER,
};

export const Views: TabRoutes = {
	Component: SaveView,
	name: (
		<div className="tab-item">
			<TowerControl size={16} /> Views
		</div>
	),
	route: ROUTES.METER_EXPLORER_VIEWS,
	key: ROUTES.METER_EXPLORER_VIEWS,
};
