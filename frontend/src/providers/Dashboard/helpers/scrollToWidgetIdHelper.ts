import { create } from 'zustand';

interface ScrollToWidgetIdState {
	toScrollWidgetId: string;
	setToScrollWidgetId: (widgetId: string) => void;
}

export const useScrollToWidgetIdStore = create<ScrollToWidgetIdState>(
	(set) => ({
		toScrollWidgetId: '',
		setToScrollWidgetId: (widgetId): void => set({ toScrollWidgetId: widgetId }),
	}),
);
