import Loadable from 'components/Loadable';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { BarChart, Compass, Gauge } from '@signozhq/icons';

const SummaryPage = Loadable(() => import('container/MetricsExplorer/Summary'));

const ExplorerPage = Loadable(
	() => import('container/MetricsExplorer/Explorer'),
);

const VolumeControlTab = Loadable(
	() =>
		import('container/MetricsExplorer/VolumeControl/components/VolumeControlTab/VolumeControlTab'),
);

export const Summary: TabRoutes = {
	Component: SummaryPage,
	name: (
		<div className="tab-item">
			<BarChart size={16} /> Summary
		</div>
	),
	route: ROUTES.METRICS_EXPLORER,
	key: ROUTES.METRICS_EXPLORER,
};

export const Explorer: TabRoutes = {
	Component: ExplorerPage,
	name: (
		<div className="tab-item">
			<Compass size={16} /> Explorer
		</div>
	),
	route: ROUTES.METRICS_EXPLORER_EXPLORER,
	key: ROUTES.METRICS_EXPLORER_EXPLORER,
};

export const VolumeControl: TabRoutes = {
	Component: VolumeControlTab,
	name: (
		<div className="tab-item">
			<Gauge size={16} /> Volume Control
		</div>
	),
	route: ROUTES.METRICS_EXPLORER_VOLUME_CONTROL,
	key: ROUTES.METRICS_EXPLORER_VOLUME_CONTROL,
};
