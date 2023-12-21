import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import LogsExplorer from 'pages/LogsExplorer';
import Pipelines from 'pages/Pipelines';
import { useLocation } from 'react-use';

export const logsExplorer = {
	Component: LogsExplorer,
	name: 'Logs Explorer',
	route: ROUTES.LOGS,
	key: ROUTES.LOGS,
};

export const logsPipelines = {
	Component: Pipelines,
	name: 'Logs Pipelines',
	route: ROUTES.LOGS_PIPELINES,
	key: ROUTES.LOGS_PIPELINES,
};

export default function LogsModulePage(): JSX.Element {
	const { pathname } = useLocation();

	const routes = [logsExplorer, logsPipelines];

	return <RouteTab routes={routes} activeKey={pathname} history={history} />;
}
