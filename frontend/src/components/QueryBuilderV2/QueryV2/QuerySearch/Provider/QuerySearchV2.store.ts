import { createStore, StoreApi } from 'zustand';

export type QuerySearchV2Store = {
	/**
	 * Initial expression (set by provider, used to combine with user expression)
	 */
	initialExpression: string;
	/**
	 * User-typed expression (local state, updates on typing)
	 */
	inputExpression: string;
	/**
	 * Committed expression (synced to URL, updates on submit)
	 */
	committedExpression: string;
	setInitialExpression: (expression: string) => void;
	setInputExpression: (expression: string) => void;
	commitExpression: (expression: string) => void;
	resetExpression: () => void;
	initializeFromUrl: (urlExpression: string) => void;
};

export function createExpressionStore(): StoreApi<QuerySearchV2Store> {
	return createStore<QuerySearchV2Store>((set) => ({
		initialExpression: '',
		inputExpression: '',
		committedExpression: '',
		setInitialExpression: (expression: string): void => {
			set({ initialExpression: expression });
		},
		setInputExpression: (expression: string): void => {
			set({ inputExpression: expression });
		},
		commitExpression: (expression: string): void => {
			set({
				inputExpression: expression,
				committedExpression: expression,
			});
		},
		resetExpression: (): void => {
			set({
				inputExpression: '',
				committedExpression: '',
			});
		},
		initializeFromUrl: (urlExpression: string): void => {
			set({
				inputExpression: urlExpression,
				committedExpression: urlExpression,
			});
		},
	}));
}
