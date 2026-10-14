import { useCallback, useEffect, useRef, useState } from 'react';

import {
	SAVED_VIEW_HOVER_CARD_CLOSE_DELAY_MS,
	SAVED_VIEW_HOVER_CARD_OPEN_DELAY_MS,
} from '../constants';
import {
	SavedViewHoverCardTarget,
	UseSavedViewHoverCardResult,
} from '../types';

export function useSavedViewHoverCard(): UseSavedViewHoverCardResult {
	const [target, setTarget] = useState<SavedViewHoverCardTarget | null>(null);
	const openTimer = useRef<ReturnType<typeof setTimeout>>();
	const closeTimer = useRef<ReturnType<typeof setTimeout>>();

	const cancelOpen = useCallback(
		(): void => clearTimeout(openTimer.current),
		[],
	);
	const cancelClose = useCallback(
		(): void => clearTimeout(closeTimer.current),
		[],
	);

	const scheduleClose = useCallback((): void => {
		cancelClose();
		closeTimer.current = setTimeout(
			() => setTarget(null),
			SAVED_VIEW_HOVER_CARD_CLOSE_DELAY_MS,
		);
	}, [cancelClose]);

	const onRowEnter = useCallback(
		(next: SavedViewHoverCardTarget): void => {
			cancelOpen();
			openTimer.current = setTimeout(() => {
				cancelClose();
				setTarget(next);
			}, SAVED_VIEW_HOVER_CARD_OPEN_DELAY_MS);
		},
		[cancelOpen, cancelClose],
	);

	const onRowLeave = useCallback((): void => {
		cancelOpen();
		scheduleClose();
	}, [cancelOpen, scheduleClose]);

	const close = useCallback((): void => {
		cancelOpen();
		cancelClose();
		setTarget(null);
	}, [cancelOpen, cancelClose]);

	useEffect(
		() => (): void => {
			cancelOpen();
			cancelClose();
		},
		[cancelOpen, cancelClose],
	);

	return {
		target,
		onRowEnter,
		onRowLeave,
		onCardEnter: cancelClose,
		onCardLeave: scheduleClose,
		close,
	};
}
