import { useLocation } from 'react-use';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';

import { logsExplorer, logsPipelines } from './constants';

import './LogsModulePage.styles.scss';

export default function LogsModulePage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [logsExplorer, logsPipelines];

	return (
		<RouteTab
			className="logs-module-container"
			routes={routes}
			activeKey={pathname}
		/>
	);
}
