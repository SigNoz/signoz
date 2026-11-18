import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import ExplorerPage from 'container/MetricsExplorer/Explorer';
import SummaryPage from 'container/MetricsExplorer/Summary';
import VolumeControlTab from 'container/MetricsExplorer/VolumeControl/components/VolumeControlTab/VolumeControlTab';
import { BarChart, Compass, Gauge } from '@signozhq/icons';

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
	Component: (): JSX.Element => <ExplorerPage />,
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
