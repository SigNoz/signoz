import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { Location, Action } from 'history';

interface BlockedNavigationDetails {
	location: Location;
	action: Action;
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
 *   history.push('/next');
 * };
 * ```
 *
 * @param shouldBlock - When true, blocks navigation and shows browser beforeunload prompt
 */
export function useNavigationBlocker(
	shouldBlock: boolean,
): UseNavigationBlockerResult {
	const history = useHistory();
	const [blockedNavigation, setBlockedNavigation] =
		useState<BlockedNavigationDetails | null>(null);
	const unblockRef = useRef<(() => void) | null>(null);
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

		unblockRef.current = history.block((location, action) => {
			if (bypassNextRef.current) {
				bypassNextRef.current = false;
				return undefined;
			}
			setBlockedNavigation({ location, action });
			return false;
		});

		return (): void => {
			if (unblockRef.current) {
				unblockRef.current();
				unblockRef.current = null;
			}
			bypassNextRef.current = false;
		};
	}, [shouldBlock, history]);

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

		const { location, action } = blockedNavigation;
		setBlockedNavigation(null);

		switch (action) {
			case 'PUSH':
				history.push(location);
				break;
			case 'REPLACE':
				history.replace(location);
				break;
			case 'POP':
				history.goBack();
				break;
		}
	}, [blockedNavigation, history]);

	const cancelNavigation = useCallback((): void => {
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
