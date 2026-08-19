import { useCallback, useEffect, useRef, useState } from 'react';
import { blockNavigation } from 'lib/router/navigation';
import type {
	AppLocation,
	BlockedTransition,
	NavigationAction,
} from 'lib/router/types';

interface BlockedNavigationDetails {
	location: AppLocation;
	action: NavigationAction;
}

interface UseNavigationBlockerResult {
	/** True when navigation was attempted and blocked */
	isBlocked: boolean;
	/** Details of the blocked navigation attempt */
	blockedNavigationDetails: BlockedNavigationDetails | null;
	/** Call to proceed with blocked navigation (discard changes) */
	confirmNavigation: () => void;
	/** Call to cancel and stay on page */
	cancelNavigation: () => void;
	/** Call before programmatic navigation to bypass blocker once */
	allowNextNavigation: () => void;
}

/**
 * Blocks navigation when there are unsaved changes.
 *
 * @example
 * ```tsx
 * const { isBlocked, confirmNavigation, cancelNavigation, allowNextNavigation } =
 *   useNavigationBlocker(hasUnsavedChanges);
 *
 * // Show confirmation modal when blocked
 * <Modal open={isBlocked} onConfirm={confirmNavigation} onCancel={cancelNavigation} />
 *
 * // Bypass blocker after successful save
 * const handleSave = async () => {
 *   await save();
 *   allowNextNavigation();
 *   navigate('/next');
 * };
 * ```
 *
 * @param shouldBlock - When true, blocks navigation and shows browser beforeunload prompt
 */
export function useNavigationBlocker(
	shouldBlock: boolean,
): UseNavigationBlockerResult {
	const [blockedNavigation, setBlockedNavigation] =
		useState<BlockedNavigationDetails | null>(null);
	const unblockRef = useRef<(() => void) | null>(null);
	const retryRef = useRef<(() => void) | null>(null);
	const bypassNextRef = useRef(false);

	useEffect(() => {
		if (!shouldBlock) {
			if (unblockRef.current) {
				unblockRef.current();
				unblockRef.current = null;
			}
			bypassNextRef.current = false;
			return;
		}

		// history@5 cancels the transition itself while a blocker is registered,
		// so letting one through means unblocking and retrying it — there is no
		// return-undefined-to-allow protocol any more, and a retry issued while
		// still blocked comes straight back here. The blocker is re-registered
		// afterwards so a single bypass does not disarm the rest of the session.
		const register = (): void => {
			unblockRef.current = blockNavigation((transition: BlockedTransition) => {
				if (bypassNextRef.current) {
					bypassNextRef.current = false;
					unblockRef.current?.();
					unblockRef.current = null;
					transition.retry();
					register();
					return;
				}
				retryRef.current = transition.retry;
				setBlockedNavigation({
					location: transition.location,
					action: transition.action,
				});
			});
		};

		register();

		return (): void => {
			if (unblockRef.current) {
				unblockRef.current();
				unblockRef.current = null;
			}
			bypassNextRef.current = false;
		};
	}, [shouldBlock]);

	useEffect(() => {
		if (!shouldBlock) {
			return;
		}

		const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
			event.preventDefault();
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		return (): void => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	}, [shouldBlock]);

	const confirmNavigation = useCallback((): void => {
		if (!blockedNavigation) {
			return;
		}

		if (unblockRef.current) {
			unblockRef.current();
			unblockRef.current = null;
		}

		setBlockedNavigation(null);

		// The transition replays itself, so a blocked REPLACE stays a REPLACE and
		// a blocked POP still walks the history stack.
		const retry = retryRef.current;
		retryRef.current = null;
		retry?.();
	}, [blockedNavigation]);

	const cancelNavigation = useCallback((): void => {
		retryRef.current = null;
		setBlockedNavigation(null);
	}, []);

	const allowNextNavigation = useCallback((): void => {
		bypassNextRef.current = true;
	}, []);

	return {
		isBlocked: blockedNavigation !== null,
		blockedNavigationDetails: blockedNavigation,
		confirmNavigation,
		cancelNavigation,
		allowNextNavigation,
	};
}
