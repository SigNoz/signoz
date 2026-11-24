import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LOCALSTORAGE } from 'constants/localStorage';

// Most-recently-viewed list is capped so it stays a useful shortlist.
const RECENT_LIMIT = 20;

interface AlertRuleViewsState {
	railCollapsed: boolean;
	recent: string[]; // rule ids, most-recent first
	setRailCollapsed: (collapsed: boolean) => void;
	markViewed: (id: string) => void;
}

export const useAlertRuleViewsStore = create<AlertRuleViewsState>()(
	persist(
		(set) => ({
			railCollapsed: false,
			recent: [],
			setRailCollapsed: (collapsed): void => {
				set({ railCollapsed: collapsed });
			},
			markViewed: (id): void => {
				set((s) => ({
					recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, RECENT_LIMIT),
				}));
			},
		}),
		{ name: LOCALSTORAGE.ALERT_RULES_LIST_VIEWS },
	),
);
