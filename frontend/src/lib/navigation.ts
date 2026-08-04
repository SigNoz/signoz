import { getBaseUrl } from 'utils/basePath';

export type NavigationReferrer =
	| 'deep_link'
	| 'nav_sidebar'
	| 'external_link'
	| 'reload'
	| 'back_forward';

export function getNavigationReferrer(): NavigationReferrer {
	// Can be empty in some browsers and in jsdom
	const navEntry = performance.getEntriesByType('navigation')[0] as
		| PerformanceNavigationTiming
		| undefined;

	if (navEntry?.type === 'reload') {
		return 'reload';
	}
	if (navEntry?.type === 'back_forward') {
		return 'back_forward';
	}

	if (!document.referrer) {
		return 'deep_link';
	}
	if (document.referrer.includes(getBaseUrl())) {
		return 'nav_sidebar';
	}
	return 'external_link';
}
