import { create } from 'zustand';

interface UnsavedChangesState {
	count: number;
}

export const useUnsavedChangesStore = create<UnsavedChangesState>()(() => ({
	count: 0,
}));

export const holdUnsavedChanges = (): (() => void) => {
	useUnsavedChangesStore.setState((state) => ({ count: state.count + 1 }));
	return (): void =>
		useUnsavedChangesStore.setState((state) => ({ count: state.count - 1 }));
};
