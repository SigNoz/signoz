import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { Compass, Cone, TowerControl } from 'lucide-react';
import SaveView from 'pages/SaveView';
import TracesExplorer from 'pages/TracesExplorer';
import TracesFunnelDetails from 'pages/TracesFunnelDetails';
import TracesFunnels from 'pages/TracesFunnels';
import { matchPath, useLocation } from 'react-router-dom';

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

export const tracesFunnel: TabRoutes = {
	Component: (): JSX.Element => {
		const { pathname } = useLocation();
		const isFunnelDetails = matchPath(pathname, ROUTES.TRACES_FUNNELS_DETAIL);

		return isFunnelDetails ? <TracesFunnelDetails /> : <TracesFunnels />;
	},
	name: (
		<div className="tab-item">
			<Cone className="funnel-icon" size={16} /> Funnels
		</div>
	),
	route: ROUTES.TRACES_FUNNELS,
	key: ROUTES.TRACES_FUNNELS,
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
