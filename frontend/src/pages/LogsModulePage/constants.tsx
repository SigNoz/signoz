import Loadable from 'components/Loadable';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { Compass, Workflow } from '@signozhq/icons';

const LogsExplorer = Loadable(() => import('pages/LogsExplorer'));
const Pipelines = Loadable(() => import('pages/Pipelines'));

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
