import type { ComponentType } from 'react';
import { useOutletContext } from 'react-router';
import NotFound from 'components/NotFound';

import type { AppRoutes } from './routes';

/**
 * The routes the plan, the license and the feature flags enable. The root
 * layout computes it and hands it down as outlet context.
 */
export type EnabledRouteKeys = ReadonlySet<AppRoutes['key']>;

interface RouteGateProps {
	routeKey: AppRoutes['key'];
	component: ComponentType;
}

/**
 * The table is created once, so a route the session may not use is still in
 * it. It renders the not-found page instead, which is what the old dynamic
 * `<Switch>` fell through to.
 */
export function RouteGate({
	routeKey,
	component: Component,
}: RouteGateProps): JSX.Element {
	const enabledRouteKeys = useOutletContext<EnabledRouteKeys>();
	return enabledRouteKeys.has(routeKey) ? <Component /> : <NotFound />;
}
