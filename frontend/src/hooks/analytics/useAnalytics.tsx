import { useAppContext } from 'providers/App/App';
import { useCallback } from 'react';
import { extractDomain } from 'utils/app';

const useAnalytics = (): any => {
	const { user } = useAppContext();

	// Segment Page View - analytics.page([category], [name], [properties], [options], [callback]);
	const trackPageView = useCallback(
		(pageName: string): void => {
			if (user && user.email) {
				window.analytics.page(null, pageName, {
					userId: user.email,
				});
			}
		},
		[user],
	);

	const trackEvent = (
		eventName: string,
		properties?: Record<string, unknown>,
	): void => {
		if (user && user.email) {
			const context = {
				context: {
					groupId: extractDomain(user?.email),
				},
			};

			const updatedProperties = { ...properties };
			updatedProperties.userId = user.email;
			window.analytics.track(eventName, properties, context);
		}
	};

	return { trackPageView, trackEvent };
};

export default useAnalytics;
