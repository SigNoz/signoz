import { createStore, StoreApi } from 'zustand';

export type QuerySearchV2Store = {
	/**
	 * User-typed expression (local state, updates on typing)
	 */
	inputExpression: string;
	/**
	 * Committed expression (synced to URL, updates on submit)
	 */
	committedExpression: string;
	setInputExpression: (expression: string) => void;
	commitExpression: (expression: string) => void;
	resetExpression: () => void;
	initializeFromUrl: (urlExpression: string) => void;
};

export interface QuerySearchProps {
	initialExpression: string | undefined;
	onChange: (expression: string) => void;
	onRun: (expression: string) => void;
}

export interface QuerySearchV2ContextValue {
	/**
	 * Combined expression: "initialExpression AND (userExpression)"
	 */
	expression: string;
	userExpression: string;
	initialExpression: string;
	querySearchProps: QuerySearchProps;
}

export function createExpressionStore(): StoreApi<QuerySearchV2Store> {
	return createStore<QuerySearchV2Store>((set) => ({
		inputExpression: '',
		committedExpression: '',
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
