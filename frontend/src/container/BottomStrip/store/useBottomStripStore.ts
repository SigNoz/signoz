import type { ReactNode } from 'react';
import { create } from 'zustand';

interface BottomStripState {
	/** What the strip shows on the left, or null to fall back to the version. */
	left: ReactNode | null;
	/** Which page owns the current value — see `clearLeft`. */
	ownerId: string | null;
	setLeft: (ownerId: string, left: ReactNode) => void;
	clearLeft: (ownerId: string) => void;
}

export const useBottomStripStore = create<BottomStripState>()((set, get) => ({
	left: null,
	ownerId: null,
	setLeft: (ownerId, left): void => set({ left, ownerId }),
	// Only the current owner may clear. On a plain route swap React runs the old
	// page's cleanup before the new page's effect, so this is moot, but two
	// consumers can be mounted at once (a page under a drawer): the one that set
	// last owns the slot, and the other unmounting must not wipe it.
	clearLeft: (ownerId): void => {
		if (get().ownerId === ownerId) {
			set({ left: null, ownerId: null });
		}
	},
}));
