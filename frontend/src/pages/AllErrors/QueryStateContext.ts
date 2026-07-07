import { create } from 'zustand';

interface AllErrorsQueryState {
	isFetching: boolean;
	isCancelled: boolean;
	setIsFetching: (isFetching: boolean) => void;
	setIsCancelled: (isCancelled: boolean) => void;
}

export const useAllErrorsQueryState = create<AllErrorsQueryState>((set) => ({
	isFetching: false,
	isCancelled: false,
	setIsFetching: (isFetching): void => {
		set((state) => ({
			isFetching,
			// Auto-reset cancelled when a new fetch starts
			isCancelled: isFetching ? false : state.isCancelled,
		}));
	},
	setIsCancelled: (isCancelled): void => {
		set({ isCancelled });
	},
}));
