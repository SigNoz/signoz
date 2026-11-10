import { create } from 'zustand';

export interface IDrawerLifecycleStore {
	openedAt: number | null;
	markOpened: () => void;
	markClosed: () => void;
	getDrawerDurationMs: () => number | null;
}

export const useDrawerLifecycleStore = create<IDrawerLifecycleStore>()(
	(set, get) => ({
		openedAt: null,
		markOpened: (): void => set({ openedAt: Date.now() }),
		markClosed: (): void => set({ openedAt: null }),
		getDrawerDurationMs: (): number | null => {
			const { openedAt } = get();
			return openedAt == null ? null : Date.now() - openedAt;
		},
	}),
);

export const getDrawerDurationMs = (): number | null =>
	useDrawerLifecycleStore.getState().getDrawerDurationMs();
