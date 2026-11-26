import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import BreakDownPage from 'container/MeterExplorer/Breakdown/BreakDown';
import ExplorerPage from 'container/MeterExplorer/Explorer';
import { Compass, TowerControl } from '@signozhq/icons';

export const Explorer: TabRoutes = {
	Component: (): JSX.Element => <ExplorerPage />,
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
