import './LogsModulePage.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import history from 'lib/history';
import { useLocation } from 'react-use';

import { logSaveView, logsExplorer, logsPipelines } from './constants';

export default function LogsModulePage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [logsExplorer, logsPipelines, logSaveView];

	return (
		<div className="logs-module-container">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}
