import { analytics } from 'AppRoutes';

function trackPageView(pageName: string): void {
	analytics.page(pageName);
}

function trackEvent(
	eventName: string,
	properties?: Record<string, unknown>,
): void {
	analytics.track(eventName, properties);
}

export { trackEvent, trackPageView };
