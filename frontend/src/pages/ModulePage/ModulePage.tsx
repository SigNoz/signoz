import './ModulePage.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { useLocation } from 'react-use';
import { DataSource } from 'types/common/queryBuilder';

import {
	logSaveView,
	logsExplorer,
	logsPipelines,
	TAB_LOGS_PATH,
	TAB_TRACES_PATH,
	tracesExplorer,
	tracesSaveView,
} from './constants';

export default function ModulePage(): JSX.Element {
	const { pathname } = useLocation();
	const urlQuery = useUrlQuery();
	const sourcepage = urlQuery.get('sourcepage');

	const routes: TabRoutes[] = [];
	if (pathname !== undefined) {
		if (TAB_LOGS_PATH.includes(pathname) || sourcepage === DataSource.LOGS) {
			routes.push(logsExplorer, logsPipelines, logSaveView);
		} else if (
			TAB_TRACES_PATH.includes(pathname) ||
			sourcepage === DataSource.TRACES
		) {
			routes.push(tracesExplorer, tracesSaveView);
		}
	}

	return (
		<div className="module-container">
			<RouteTab routes={routes} activeKey={pathname} history={history} />;
		</div>
	);
}
