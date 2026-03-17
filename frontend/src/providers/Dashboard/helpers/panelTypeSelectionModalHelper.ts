import { create } from 'zustand';

interface IPanelTypeSelectionModalState {
	isPanelTypeSelectionModalOpen: boolean;
	setIsPanelTypeSelectionModalOpen: (isOpen: boolean) => void;
}

/**
 * This helper is used for selecting the panel type when creating a new panel in the dashboard.
 * It uses Zustand for state management to keep track of whether the panel type selection modal is open or closed.
 */
export const usePanelTypeSelectionModalStore = create<IPanelTypeSelectionModalState>(
	(set) => ({
		isPanelTypeSelectionModalOpen: false,
		setIsPanelTypeSelectionModalOpen: (isOpen): void =>
			set({ isPanelTypeSelectionModalOpen: isOpen }),
	}),
);
