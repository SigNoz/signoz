import ROUTES from 'constants/routes';
import { useAppContext } from 'providers/App/App';
import { matchPath } from 'react-router-dom';

import { useIsAIObservabilityEnabled } from './useIsAIObservabilityEnabled';

interface FeatureGatedRoute {
	path: string;
	enabled: boolean;
}

export function useFeatureGatedRouteRedirect(pathname: string): string | null {
	const { featureFlags, isFetchingFeatureFlags } = useAppContext();
	const isAIObservabilityEnabled = useIsAIObservabilityEnabled();

	const gatedRoutes: FeatureGatedRoute[] = [
		{
			// Prefix match (matchPath is non-exact) so the whole LLM observability
			// tree — and any future sub-routes — is gated by the same flag.
			path: ROUTES.LLM_OBSERVABILITY,
			enabled: isAIObservabilityEnabled,
		},
	];

	const blockedRoute = gatedRoutes.find(
		(route) =>
			matchPath(pathname, { path: route.path }) !== null && !route.enabled,
	);

	// Feature flags load asynchronously and start as `null`. While the initial
	// fetch is still in flight we don't know whether a gated flag is enabled, so
	// redirecting now would boot users off valid deep links (e.g. a hard refresh
	// on the pricing page) whenever the flag ultimately resolves to enabled. Wait
	// for the fetch to settle; once it does (success or error) we gate normally.
	if (featureFlags === null && isFetchingFeatureFlags) {
		return null;
	}

	return blockedRoute ? ROUTES.HOME : null;
}
