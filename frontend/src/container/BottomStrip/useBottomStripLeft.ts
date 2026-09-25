import { type ReactNode, useEffect, useId } from 'react';

import { useBottomStripStore } from './store/useBottomStripStore';

/**
 * Puts `node` on the left of the bottom strip for as long as the calling page is
 * mounted. Pass null to show nothing and let the version through.
 *
 * There is no refresh API by design: a page that refetches re-renders, which
 * produces a new node, which re-runs this effect. Wrap the node in `useMemo`
 * keyed on the values it shows, or the store is written on every render.
 */
export function useBottomStripLeft(node: ReactNode | null): void {
	const ownerId = useId();
	const setLeft = useBottomStripStore((state) => state.setLeft);
	const clearLeft = useBottomStripStore((state) => state.clearLeft);

	useEffect(() => {
		setLeft(ownerId, node);

		return (): void => clearLeft(ownerId);
	}, [node, ownerId, setLeft, clearLeft]);
}
