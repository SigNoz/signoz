import { create } from 'zustand';

interface AllErrorsQueryState {
	isFetching: boolean;
	setIsFetching: (isFetching: boolean) => void;
}

export const useAllErrorsQueryState = create<AllErrorsQueryState>((set) => ({
	isFetching: false,
	setIsFetching: (isFetching): void => {
		set({ isFetching });
	},
}));
