import { useEffect } from 'react';

import { PageActionRegistry } from './PageActionRegistry';
import { PageAction } from './types';

/**
 * Registers page-specific actions into the PageActionRegistry for the lifetime
 * of the calling component. Cleanup (unregister) happens automatically on unmount.
 *
 * Usage:
 *   const actions = useMemo(() => [
 *     logsRunQueryAction({ handleRunQuery, ... }),
 *   ], [handleRunQuery, ...]);
 *
 *   usePageActions('logs-explorer', actions);
 *
 * IMPORTANT: memoize the `actions` array with useMemo so that the reference
 * stays stable and we don't re-register on every render.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePageActions(
	pageId: string,
	actions: PageAction<any>[],
): void {
	useEffect(() => {
		PageActionRegistry.register(pageId, actions);
		return (): void => {
			PageActionRegistry.unregister(pageId);
		};
		// Re-register when actions reference changes (e.g. new callbacks after store update)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pageId, actions]);
}
