import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { Location, Action } from 'history';

interface BlockedNavigation {
	location: Location;
	action: Action;
}

interface UseNavigationBlockerResult {
	isBlocked: boolean;
	blockedNavigation: BlockedNavigation | null;
	confirmNavigation: () => void;
	cancelNavigation: () => void;
	allowNextNavigation: () => void;
}

export function useNavigationBlocker(
	shouldBlock: boolean,
): UseNavigationBlockerResult {
	const history = useHistory();
	const [blockedNavigation, setBlockedNavigation] =
		useState<BlockedNavigation | null>(null);
	const unblockRef = useRef<(() => void) | null>(null);
	const bypassNextRef = useRef(false);

	useEffect(() => {
		if (!shouldBlock) {
			if (unblockRef.current) {
				unblockRef.current();
				unblockRef.current = null;
			}
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
		};
	}, [shouldBlock, history]);

	useEffect(() => {
		if (!shouldBlock) {
			return;
		}

		const handleBeforeUnload = (event: BeforeUnloadEvent): string => {
			event.preventDefault();
			return '';
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
		blockedNavigation,
		confirmNavigation,
		cancelNavigation,
		allowNextNavigation,
	};
}
