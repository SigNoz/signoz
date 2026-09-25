import { create } from 'zustand';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import type { QueryMode } from 'types/common/dashboard';

import type { PanelKind } from '../Panels/types/panelKind';

type BuilderByMode = Partial<Record<QueryMode, Query['builder']>>;

/**
 * Builder queries the panel editor uthoris not currently showing, per kind and aing mode.
 * Query Builder and AI share `currentQuery.builder`, so only one of them is ever live;
 * the other waits here, as does every mode of a kind the editor has switched away from.
 * In memory only — a reload starts from the saved panel, like the kind-switch cache.
 */
export interface QueryModeCacheStore {
	byKind: Partial<Record<PanelKind, BuilderByMode>>;
	park: (kind: PanelKind, mode: QueryMode, builder: Query['builder']) => void;
	clear: () => void;
}

export const useQueryModeCacheStore = create<QueryModeCacheStore>((set) => ({
	byKind: {},
	park: (kind, mode, builder): void => {
		set((state) => ({
			byKind: {
				...state.byKind,
				[kind]: { ...state.byKind[kind], [mode]: builder },
			},
		}));
	},
	clear: (): void => {
		set({ byKind: {} });
	},
}));
