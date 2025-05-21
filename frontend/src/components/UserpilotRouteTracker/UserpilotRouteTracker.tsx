import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Userpilot } from 'userpilot';

/**
 * UserpilotRouteTracker - A component that tracks route changes and calls Userpilot.reload
 * on actual page changes (pathname changes or significant query parameter changes).
 *
 * This component renders nothing and is designed to be placed once high in the component tree.
 */
function UserpilotRouteTracker(): null {
	const location = useLocation();
	const prevPathRef = useRef<string>(location.pathname);
	const prevSearchRef = useRef<string>(location.search);
	const isFirstRenderRef = useRef<boolean>(true);

	// Function to reload Userpilot safely - using useCallback to avoid dependency issues
	const reloadUserpilot = useCallback((): void => {
		try {
			if (typeof Userpilot !== 'undefined' && Userpilot.reload) {
				setTimeout(() => {
					Userpilot.reload();
				}, 100);
			}
		} catch (error) {
			console.error('[Userpilot] Error reloading on route change:', error);
		}
	}, []);

	// Handle first render
	useEffect(() => {
		if (isFirstRenderRef.current) {
			isFirstRenderRef.current = false;
			reloadUserpilot();
		}
	}, [reloadUserpilot]);

	// Handle route/query changes
	useEffect(() => {
		// Skip first render as it's handled by the effect above
		if (isFirstRenderRef.current) {
			return;
		}

		// Check if the path has changed or if significant query params have changed
		const pathChanged = location.pathname !== prevPathRef.current;
		const searchChanged = location.search !== prevSearchRef.current;

		if (pathChanged || searchChanged) {
			// Update refs
			prevPathRef.current = location.pathname;
			prevSearchRef.current = location.search;
			reloadUserpilot();
		}
	}, [location.pathname, location.search, reloadUserpilot]);

	return null;
}

export default UserpilotRouteTracker;
