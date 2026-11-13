import { create } from 'zustand';

import { InfraMonitoringEntity } from '../constants';
import { SelectedItemParams } from '../hooks';

export interface DrawerHistoryEntry {
	params: SelectedItemParams;
	/** Category of the resource that was open, which picks the icon of its crumb */
	category: InfraMonitoringEntity;
	/** Name of that resource, the label of its crumb */
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
	/** Drops the entry at `length` and every one after it */
	trimTo: (length: number) => void;
	reset: () => void;
}

/**
 * The trail left by opening one resource from another's overview tab, which
 * the drawer shows as its breadcrumb so it can step back instead of only
 * closing.
 */
export const useDrawerHistoryStore = create<IDrawerHistoryStore>()(
	(set, get) => ({
		entries: [],
		push: (entry): void => set({ entries: [...get().entries, entry] }),
		trimTo: (length): void => set({ entries: get().entries.slice(0, length) }),
		reset: (): void => set({ entries: [] }),
	}),
);

export const resetDrawerHistory = (): void =>
	useDrawerHistoryStore.getState().reset();

export const pushDrawerHistory = (entry: DrawerHistoryEntry): void =>
	useDrawerHistoryStore.getState().push(entry);

export const getDrawerHistoryDepth = (): number =>
	useDrawerHistoryStore.getState().entries.length;
