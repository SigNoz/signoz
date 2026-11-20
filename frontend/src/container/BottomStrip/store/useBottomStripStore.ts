import { create } from 'zustand';

import {
	BOTTOM_STRIP_HEIGHT,
	BOTTOM_STRIP_MAX_HEIGHT,
	BOTTOM_STRIP_MIN_HEIGHT,
} from '../constants';
import type { StripItem } from '../types';

interface BottomStripState {
	/** What the strip shows on the left, or null to fall back to the version. */
	left: StripItem[] | null;
	/** Which page owns the current value — see `clearLeft`. */
	ownerId: string | null;
	/** In px; the dev height pill changes it. */
	height: number;
	setLeft: (ownerId: string, left: StripItem[] | null) => void;
	clearLeft: (ownerId: string) => void;
	setHeight: (height: number) => void;
	/** Moves the height by `delta` px, kept within the min and max. */
	nudgeHeight: (delta: number) => void;
}

export const useBottomStripStore = create<BottomStripState>()((set, get) => ({
	left: null,
	ownerId: null,
	height: BOTTOM_STRIP_HEIGHT,
	setLeft: (ownerId, left): void => set({ left, ownerId }),
	setHeight: (height): void => set({ height }),
	nudgeHeight: (delta): void =>
		set((state) => ({
			height: Math.min(
				BOTTOM_STRIP_MAX_HEIGHT,
				Math.max(BOTTOM_STRIP_MIN_HEIGHT, state.height + delta),
			),
		})),
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
