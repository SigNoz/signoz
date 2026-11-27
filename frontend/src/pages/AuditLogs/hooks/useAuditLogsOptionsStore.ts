import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LOCALSTORAGE } from 'constants/localStorage';
import { FontSize } from 'container/OptionsMenu/types';

interface AuditLogsOptionsState {
	fontSize: FontSize;
	setFontSize: (fontSize: FontSize) => void;
}

export const useAuditLogsOptionsStore = create<AuditLogsOptionsState>()(
	persist(
		(set) => ({
			fontSize: FontSize.SMALL,
			setFontSize: (fontSize): void => {
				set({ fontSize });
			},
		}),
		{ name: LOCALSTORAGE.AUDIT_LOGS_OPTIONS },
	),
);
