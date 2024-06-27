import './LogsModulePage.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import history from 'lib/history';
import { useLocation } from 'react-use';

import { logSaveView, logsExplorer, logsPipelines } from './constants';

export default function LogsModulePage(): JSX.Element {
	let { pathname } = useLocation();
	if (pathname && pathname?.indexOf('/website') > -1) {
		pathname = pathname.replace(/\/website/, '');
	}

	const routes: TabRoutes[] = [logsExplorer, logsPipelines, logSaveView];

	return (
		<div className="logs-module-container">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}
