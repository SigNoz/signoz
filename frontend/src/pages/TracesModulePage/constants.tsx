import { TabRoutes } from 'components/RouteTab/types';
import { matchRoute } from 'lib/router/matchRoute';
import ROUTES from 'constants/routes';
import { Compass, Cone } from '@signozhq/icons';
import TracesExplorer from 'pages/TracesExplorer';
import TracesFunnelDetails from 'pages/TracesFunnelDetails';
import TracesFunnels from 'pages/TracesFunnels';

export const tracesExplorer: TabRoutes = {
	Component: (): JSX.Element => <TracesExplorer />,
	name: (
		<div className="tab-item">
			<Compass size={16} /> Explorer
		</div>
	),
	route: ROUTES.TRACES_EXPLORER,
	key: ROUTES.TRACES_EXPLORER,
};

export const tracesFunnel = (pathname: string): TabRoutes => ({
	Component: (): JSX.Element => {
		const isFunnelDetails = matchRoute(pathname, ROUTES.TRACES_FUNNELS_DETAIL);

		return isFunnelDetails ? <TracesFunnelDetails /> : <TracesFunnels />;
	},
	name: (
		<div className="tab-item">
			<Cone className="funnel-icon" size={16} /> Funnels
		</div>
	),
	route: ROUTES.TRACES_FUNNELS,
	key: ROUTES.TRACES_FUNNELS,
});
