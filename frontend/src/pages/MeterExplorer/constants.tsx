import Loadable from 'components/Loadable';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { Compass, TowerControl } from '@signozhq/icons';

const ExplorerPage = Loadable(() => import('container/MeterExplorer/Explorer'));

const BreakDownPage = Loadable(
	() => import('container/MeterExplorer/Breakdown/BreakDown'),
);

export const Explorer: TabRoutes = {
	Component: ExplorerPage,
	name: (
		<div className="tab-item">
			<Compass size={16} /> Explorer
		</div>
	),
	route: ROUTES.METER_EXPLORER,
	key: ROUTES.METER_EXPLORER,
};

export const Meter: TabRoutes = {
	Component: BreakDownPage,
	name: (
		<div className="tab-item">
			<TowerControl size={16} /> Meter
		</div>
	),
	route: ROUTES.METER,
	key: ROUTES.METER,
};
