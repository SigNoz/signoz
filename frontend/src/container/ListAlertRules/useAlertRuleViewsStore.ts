import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LOCALSTORAGE } from 'constants/localStorage';

interface AlertRuleViewsState {
	railCollapsed: boolean;
	setRailCollapsed: (collapsed: boolean) => void;
}

export const useAlertRuleViewsStore = create<AlertRuleViewsState>()(
	persist(
		(set) => ({
			railCollapsed: false,
			setRailCollapsed: (collapsed): void => {
				set({ railCollapsed: collapsed });
			},
		}),
		{ name: LOCALSTORAGE.ALERT_RULES_LIST_VIEWS },
	),
);
