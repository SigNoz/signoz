import { useCallback, useEffect, useRef } from 'react';
import { usePopoverHandle } from '@signozhq/ui/popover';
import { SavedviewtypesSavedViewDTO } from 'api/generated/services/sigNoz.schemas';

import {
	SAVED_VIEW_HOVER_CARD_CLOSE_DELAY_MS,
	SAVED_VIEW_HOVER_CARD_OPEN_DELAY_MS,
} from '../constants';
import { UseSavedViewHoverCardResult } from '../types';

// The delays are ours rather than the popover's: the card follows a handle, not a trigger, so
// the list owns both when it appears and when it survives the pointer crossing into it.
export function useSavedViewHoverCard(): UseSavedViewHoverCardResult {
	const handle = usePopoverHandle<SavedviewtypesSavedViewDTO>();
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
			() => handle.close(),
			SAVED_VIEW_HOVER_CARD_CLOSE_DELAY_MS,
		);
	}, [cancelClose, handle]);

	const onRowEnter = useCallback(
		(view: SavedviewtypesSavedViewDTO, row: HTMLElement): void => {
			cancelOpen();
			openTimer.current = setTimeout(() => {
				cancelClose();
				handle.showAt(row, view);
			}, SAVED_VIEW_HOVER_CARD_OPEN_DELAY_MS);
		},
		[cancelOpen, cancelClose, handle],
	);

	const onRowLeave = useCallback((): void => {
		cancelOpen();
		scheduleClose();
	}, [cancelOpen, scheduleClose]);

	const close = useCallback((): void => {
		cancelOpen();
		cancelClose();
		handle.close();
	}, [cancelOpen, cancelClose, handle]);

	useEffect(
		() => (): void => {
			cancelOpen();
			cancelClose();
		},
		[cancelOpen, cancelClose],
	);

	return {
		handle,
		onRowEnter,
		onRowLeave,
		onCardEnter: cancelClose,
		onCardLeave: scheduleClose,
		close,
	};
}
