import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import { Compass, Workflow } from '@signozhq/icons';
import LogsExplorer from 'pages/LogsExplorer';
import Pipelines from 'pages/Pipelines';

export const logsExplorer: TabRoutes = {
	Component: (): JSX.Element => <LogsExplorer />,
	name: (
		<div className="tab-item">
			<Compass size={16} /> Explorer
		</div>
	),
	route: ROUTES.LOGS,
	key: ROUTES.LOGS,
};

export const logsPipelines: TabRoutes = {
	Component: (): JSX.Element => <Pipelines />,
	name: (
		<div className="tab-item">
			<Workflow size={16} /> Pipelines
		</div>
	),
	route: ROUTES.LOGS_PIPELINES,
	key: ROUTES.LOGS_PIPELINES,
};
