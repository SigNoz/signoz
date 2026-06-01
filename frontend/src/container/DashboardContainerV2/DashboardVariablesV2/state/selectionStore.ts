import { create } from 'zustand';

import {
	loadSelectionsFromStorage,
	saveSelectionsToStorage,
} from './localStorage';
import type { SelectionsByName, VariableSelection } from './types';
import { readSelectionsFromUrl, writeSelectionsToUrl } from './urlSync';

interface SelectionStoreState {
	dashboardId: string;
	selections: SelectionsByName;

	/**
	 * Hydrate from URL → fallback to LocalStorage. Called once per dashboard
	 * load. `hints` lets URL decoding pick list vs text encoding.
	 */
	hydrate: (
		dashboardId: string,
		hints: Record<string, 'list' | 'text'>,
	) => void;

	/**
	 * Set / clear the selection for a single variable. Persists to both
	 * LocalStorage and URL.
	 */
	setSelection: (name: string, selection: VariableSelection | undefined) => void;

	reset: () => void;
}

export const useVariableSelectionStore = create<SelectionStoreState>(
	(set, get) => ({
		dashboardId: '',
		selections: {},

		hydrate: (dashboardId, hints): void => {
			const fromUrl = readSelectionsFromUrl(hints);
			const fromStorage = loadSelectionsFromStorage(dashboardId);
			// URL wins over LocalStorage (shareable links override personal
			// preferences).
			const merged: SelectionsByName = { ...fromStorage, ...fromUrl };
			set({ dashboardId, selections: merged });
		},

		setSelection: (name, selection): void => {
			const { dashboardId, selections } = get();
			const next: SelectionsByName = { ...selections };
			if (selection === undefined) {
				delete next[name];
			} else {
				next[name] = selection;
			}
			set({ selections: next });
			saveSelectionsToStorage(dashboardId, next);
			writeSelectionsToUrl(next);
		},

		reset: (): void => {
			set({ dashboardId: '', selections: {} });
		},
	}),
);
