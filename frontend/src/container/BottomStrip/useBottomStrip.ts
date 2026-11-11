import { useEffect, useId } from 'react';

import { useBottomStripStore } from './store/useBottomStripStore';
import type { StripItem } from './types';

/**
 * Puts `items` in the bottom strip for as long as the calling page is mounted.
 * Pass null to show nothing and let the version through. The left is the only
 * side a page contributes to; the right is the strip's own.
 *
 * There is no refresh API by design: a page that refetches re-renders, which
 * produces new items, which re-runs this effect. Memoise the array where it is
 * built, or the store is written on every render.
 */
export function useBottomStrip(items: StripItem[] | null): void {
	const ownerId = useId();
	const setLeft = useBottomStripStore((state) => state.setLeft);
	const clearLeft = useBottomStripStore((state) => state.clearLeft);

	useEffect(() => {
		setLeft(ownerId, items);

		return (): void => clearLeft(ownerId);
	}, [items, ownerId, setLeft, clearLeft]);
}
