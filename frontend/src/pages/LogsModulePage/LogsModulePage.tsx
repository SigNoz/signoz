import './LogsModulePage.styles.scss';

import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { Compass, Workflow } from 'lucide-react';
import LogsExplorer from 'pages/LogsExplorer';
import Pipelines from 'pages/Pipelines';
import { useLocation } from 'react-use';

export const logsExplorer = {
	Component: LogsExplorer,
	name: (
		<div className="tab-item">
			<Compass size={16} /> Explorer
		</div>
	),
	route: ROUTES.LOGS,
	key: ROUTES.LOGS,
};

export const logsPipelines = {
	Component: Pipelines,
	name: (
		<div className="tab-item">
			<Workflow size={16} /> Pipelines
		</div>
	),
	route: ROUTES.LOGS_PIPELINES,
	key: ROUTES.LOGS_PIPELINES,
};

export default function LogsModulePage(): JSX.Element {
	const { pathname } = useLocation();

	const routes = [logsExplorer, logsPipelines];

	return (
		<div className="logs-module-container">
			<RouteTab routes={routes} activeKey={pathname} history={history} />;
		</div>
	);
}
