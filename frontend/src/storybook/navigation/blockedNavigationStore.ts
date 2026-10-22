import { create } from 'zustand';

export interface BlockedNavigation {
	id: number;
	/** History method the app called, e.g. `push`, `replace`, `window.open`. */
	via: string;
	/** Target the app tried to reach, already resolved to an href. */
	to: string;
}

interface BlockedNavigationStore {
	blockedNavigations: BlockedNavigation[];
	record: (via: string, to: string) => void;
	clear: () => void;
}

export const useBlockedNavigationStore = create<BlockedNavigationStore>()(
	(set) => ({
		blockedNavigations: [],
		record: (via, to): void =>
			set(({ blockedNavigations }) => ({
				blockedNavigations: [
					...blockedNavigations,
					{ id: blockedNavigations.length + 1, via, to },
				],
			})),
		clear: (): void => set({ blockedNavigations: [] }),
	}),
);

export const recordBlockedNavigation = (via: string, to: string): void =>
	useBlockedNavigationStore.getState().record(via, to);

export const clearBlockedNavigations = (): void =>
	useBlockedNavigationStore.getState().clear();
