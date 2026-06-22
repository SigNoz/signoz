import ROUTES from 'constants/routes';
import { matchPath } from 'react-router-dom';

import { useIsAIObservabilityEnabled } from './useIsAIObservabilityEnabled';

interface FeatureGatedRoute {
	path: string;
	enabled: boolean;
}

export function useFeatureGatedRouteRedirect(pathname: string): string | null {
	const isAIObservabilityEnabled = useIsAIObservabilityEnabled();

	const gatedRoutes: FeatureGatedRoute[] = [
		{
			path: ROUTES.LLM_OBSERVABILITY_MODEL_PRICING,
			enabled: isAIObservabilityEnabled,
		},
	];

	const blockedRoute = gatedRoutes.find(
		(route) =>
			matchPath(pathname, { path: route.path }) !== null && !route.enabled,
	);

	return blockedRoute ? ROUTES.HOME : null;
}
