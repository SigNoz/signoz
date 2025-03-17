import './TracesModulePage.styles.scss';

import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import history from 'lib/history';
import { useLocation } from 'react-router-dom';

import {
	tracesExplorer,
	// tracesFunnel,
	tracesSaveView,
} from './constants';

function TracesModulePage(): JSX.Element {
	const { pathname } = useLocation();

	const routes: TabRoutes[] = [
		tracesExplorer,
		// TODO(shaheer): Add funnel tab after everything is ready
		// tracesFunnel,
		tracesSaveView,
	];

	return (
		<div className="traces-module-container">
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}

export default TracesModulePage;
