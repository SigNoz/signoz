function trackPageView(pageName: string): void {
	window.analytics.page(pageName);
}

function trackEvent(
	eventName: string,
	properties: Record<string, string>,
): void {
	window.analytics.track(eventName, properties);
}

export { trackEvent, trackPageView };
