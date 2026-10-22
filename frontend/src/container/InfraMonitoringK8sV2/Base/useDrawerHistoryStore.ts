import { create } from 'zustand';

import { InfraMonitoringEntity } from '../constants';
import { SelectedItemParams } from '../hooks';

export interface DrawerHistoryEntry {
	params: SelectedItemParams;
	/** Category of the resource that was open, which the back control names */
	category: InfraMonitoringEntity;
	/** Name of that resource, shown on hover */
	label: string;
	/**
	 * The record the drawer was showing, and the prefix of the query that holds
	 * it, so stepping back renders from it instead of fetching again.
	 */
	entity: unknown;
	queryKeyPrefix: string;
}

export interface IDrawerHistoryStore {
	entries: DrawerHistoryEntry[];
	push: (entry: DrawerHistoryEntry) => void;
	pop: () => DrawerHistoryEntry | null;
	reset: () => void;
}

/**
 * The trail left by opening one resource from another's overview tab, so the
 * drawer can step back through it instead of only closing.
 */
export const useDrawerHistoryStore = create<IDrawerHistoryStore>()(
	(set, get) => ({
		entries: [],
		push: (entry): void => set({ entries: [...get().entries, entry] }),
		pop: (): DrawerHistoryEntry | null => {
			const { entries } = get();
			const previous = entries[entries.length - 1] ?? null;

			if (previous) {
				set({ entries: entries.slice(0, -1) });
			}

			return previous;
		},
		reset: (): void => set({ entries: [] }),
	}),
);

export const resetDrawerHistory = (): void =>
	useDrawerHistoryStore.getState().reset();

export const pushDrawerHistory = (entry: DrawerHistoryEntry): void =>
	useDrawerHistoryStore.getState().push(entry);

export const getDrawerHistoryDepth = (): number =>
	useDrawerHistoryStore.getState().entries.length;
