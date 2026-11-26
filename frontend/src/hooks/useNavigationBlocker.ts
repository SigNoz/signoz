import { useCallback, useEffect, useRef } from 'react';
import type {
	AppLocation,
	BlockerFunction,
	NavigationAction,
} from 'lib/router/types';
import { useAppBlocker } from 'lib/router/useAppBlocker';

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
	const bypassNextRef = useRef(false);
	const blockedActionRef = useRef<NavigationAction>('PUSH');

	useEffect(() => {
		if (!shouldBlock) {
			bypassNextRef.current = false;
		}
	}, [shouldBlock]);

	const blockerFunction = useCallback<BlockerFunction>(
		({ action }) => {
			if (!shouldBlock) {
				return false;
			}
			if (bypassNextRef.current) {
				bypassNextRef.current = false;
				return false;
			}
			blockedActionRef.current = action;
			return true;
		},
		[shouldBlock],
	);

	const blocker = useAppBlocker(blockerFunction);

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

	// The router replays a proceeded navigation itself, so a blocked REPLACE
	// stays a REPLACE and a blocked POP still walks the history stack.
	const confirmNavigation = useCallback((): void => {
		if (blocker.state === 'blocked') {
			blocker.proceed();
		}
	}, [blocker]);

	const cancelNavigation = useCallback((): void => {
		if (blocker.state === 'blocked') {
			blocker.reset();
		}
	}, [blocker]);

	const allowNextNavigation = useCallback((): void => {
		bypassNextRef.current = true;
	}, []);

	return {
		isBlocked: blocker.state === 'blocked',
		blockedNavigationDetails:
			blocker.state === 'blocked'
				? { location: blocker.location, action: blockedActionRef.current }
				: null,
		confirmNavigation,
		cancelNavigation,
		allowNextNavigation,
	};
}
