import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { extractDomain } from 'utils/app';

const useAnalytics = (): any => {
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);

	const trackPageView = (pageName: string): void => {
		if (user && user.email) {
			window.analytics.page(pageName);
		}
	};

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
			window.analytics.track(eventName, properties, context);
		}
	};

	// useEffect(() => {
	// 	// Perform any setup or cleanup related to the analytics library
	// 	// For example, initialize analytics library here

	// 	// Clean-up function (optional)
	// 	return () => {
	// 		// Perform cleanup if needed
	// 	};
	// }, []); // The empty dependency array ensures that this effect runs only once when the component mounts

	return { trackPageView, trackEvent };
};

export default useAnalytics;
