import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { Compass, TowerControl, Workflow } from 'lucide-react';
import LogsExplorer from 'pages/LogsExplorer';
import Pipelines from 'pages/Pipelines';
import SaveView from 'pages/SaveView';

export const logsExplorer: TabRoutes = {
	Component: LogsExplorer,
	name: (
		<div className="tab-item">
			<Compass size={16} /> Explorer
		</div>
	),
	route: ROUTES.LOGS,
	key: ROUTES.LOGS,
};

export const logsPipelines: TabRoutes = {
	Component: Pipelines,
	name: (
		<div className="tab-item">
			<Workflow size={16} /> Pipelines
		</div>
	),
	route: ROUTES.LOGS_PIPELINES,
	key: ROUTES.LOGS_PIPELINES,
};

export const logSaveView: TabRoutes = {
	Component: SaveView,
	name: (
		<div className="tab-item">
			<TowerControl size={16} /> Views
		</div>
	),
	route: ROUTES.LOGS_SAVE_VIEWS,
	key: ROUTES.LOGS_SAVE_VIEWS,
};
