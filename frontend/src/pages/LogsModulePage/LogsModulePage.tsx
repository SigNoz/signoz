import './LogsModulePage.styles.scss';

import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { Compass, TowerControl, Workflow } from 'lucide-react';
import LogsExplorer from 'pages/LogsExplorer';
import Pipelines from 'pages/Pipelines';
import SaveView from 'pages/SaveView';
import { useLocation } from 'react-use';
import { DataSource } from 'types/common/queryBuilder';

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

export const logSaveView = {
	Component: SaveView,
	name: (
		<div className="tab-item">
			<TowerControl size={16} /> Views
		</div>
	),
	route: `${ROUTES.SAVE_VIEWS}?sourcepage=${DataSource.LOGS}`,
	key: ROUTES.SAVE_VIEWS,
};

export default function LogsModulePage(): JSX.Element {
	const { pathname } = useLocation();

	const routes = [logsExplorer, logsPipelines, logSaveView];

	return (
		<div className="logs-module-container">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}
