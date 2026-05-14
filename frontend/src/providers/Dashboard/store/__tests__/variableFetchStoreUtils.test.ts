import {
	IVariableFetchStoreState,
	VariableFetchState,
} from '../variableFetchStore';
import {
	areAllQueryVariablesSettled,
	isSettled,
	resolveFetchState,
	unlockWaitingDynamicVariables,
} from '../variableFetchStoreUtils';

describe('variableFetchStoreUtils', () => {
	describe('isSettled', () => {
		it('should return true for idle state', () => {
			expect(isSettled('idle')).toBe(true);
		});

		it('should return true for error state', () => {
			expect(isSettled('error')).toBe(true);
		});

		it('should return false for loading state', () => {
			expect(isSettled('loading')).toBe(false);
		});

		it('should return false for revalidating state', () => {
			expect(isSettled('revalidating')).toBe(false);
		});

		it('should return false for waiting state', () => {
			expect(isSettled('waiting')).toBe(false);
		});

		it('should return false for undefined', () => {
			expect(isSettled(undefined)).toBe(false);
		});
	});

	describe('resolveFetchState', () => {
		it('should return "loading" when variable has never been fetched', () => {
			const draft: IVariableFetchStoreState = {
				states: {},
				lastUpdated: {},
				cycleIds: {},
			};

			expect(resolveFetchState(draft, 'myVar')).toBe('loading');
		});

		it('should return "loading" when lastUpdated is 0', () => {
			const draft: IVariableFetchStoreState = {
				states: {},
				lastUpdated: { myVar: 0 },
				cycleIds: {},
			};

			expect(resolveFetchState(draft, 'myVar')).toBe('loading');
		});

		it('should return "revalidating" when variable has been fetched before', () => {
			const draft: IVariableFetchStoreState = {
				states: {},
				lastUpdated: { myVar: 1000 },
				cycleIds: {},
			};

			expect(resolveFetchState(draft, 'myVar')).toBe('revalidating');
		});
	});

	describe('areAllQueryVariablesSettled', () => {
		it('should return true when all query variables are idle', () => {
			const states: Record<string, VariableFetchState> = {
				a: 'idle',
				b: 'idle',
			};
			const variableTypes = { a: 'QUERY' as const, b: 'QUERY' as const };

			expect(areAllQueryVariablesSettled(states, variableTypes)).toBe(true);
		});

		it('should return true when all query variables are in error', () => {
			const states: Record<string, VariableFetchState> = {
				a: 'error',
				b: 'error',
			};
			const variableTypes = { a: 'QUERY' as const, b: 'QUERY' as const };

			expect(areAllQueryVariablesSettled(states, variableTypes)).toBe(true);
		});

		it('should return true with a mix of idle and error query variables', () => {
			const states: Record<string, VariableFetchState> = {
				a: 'idle',
				b: 'error',
			};
			const variableTypes = { a: 'QUERY' as const, b: 'QUERY' as const };

			expect(areAllQueryVariablesSettled(states, variableTypes)).toBe(true);
		});

		it('should return false when any query variable is loading', () => {
			const states: Record<string, VariableFetchState> = {
				a: 'idle',
				b: 'loading',
			};
			const variableTypes = { a: 'QUERY' as const, b: 'QUERY' as const };

			expect(areAllQueryVariablesSettled(states, variableTypes)).toBe(false);
		});

		it('should return false when any query variable is waiting', () => {
			const states: Record<string, VariableFetchState> = {
				a: 'idle',
				b: 'waiting',
			};
			const variableTypes = { a: 'QUERY' as const, b: 'QUERY' as const };

			expect(areAllQueryVariablesSettled(states, variableTypes)).toBe(false);
		});

		it('should ignore non-QUERY variable types', () => {
			const states: Record<string, VariableFetchState> = {
				a: 'idle',
				dynVar: 'loading',
			};
			const variableTypes = {
				a: 'QUERY' as const,
				dynVar: 'DYNAMIC' as const,
			};

			expect(areAllQueryVariablesSettled(states, variableTypes)).toBe(true);
		});

		it('should return true when there are no QUERY variables', () => {
			const states: Record<string, VariableFetchState> = {
				dynVar: 'loading',
			};
			const variableTypes = { dynVar: 'DYNAMIC' as const };

			expect(areAllQueryVariablesSettled(states, variableTypes)).toBe(true);
		});
	});

	describe('unlockWaitingDynamicVariables', () => {
		it('should transition waiting dynamic variables to loading when never fetched', () => {
			const draft: IVariableFetchStoreState = {
				states: { dyn1: 'waiting', dyn2: 'waiting' },
				lastUpdated: {},
				cycleIds: {},
			};

			unlockWaitingDynamicVariables(draft, ['dyn1', 'dyn2']);

			expect(draft.states.dyn1).toBe('loading');
			expect(draft.states.dyn2).toBe('loading');
		});

		it('should transition waiting dynamic variables to revalidating when previously fetched', () => {
			const draft: IVariableFetchStoreState = {
				states: { dyn1: 'waiting' },
				lastUpdated: { dyn1: 1000 },
				cycleIds: {},
			};

			unlockWaitingDynamicVariables(draft, ['dyn1']);

			expect(draft.states.dyn1).toBe('revalidating');
		});

		it('should not touch dynamic variables that are not in waiting state', () => {
			const draft: IVariableFetchStoreState = {
				states: { dyn1: 'idle', dyn2: 'loading' },
				lastUpdated: {},
				cycleIds: {},
			};

			unlockWaitingDynamicVariables(draft, ['dyn1', 'dyn2']);

			expect(draft.states.dyn1).toBe('idle');
			expect(draft.states.dyn2).toBe('loading');
		});

		it('should handle empty dynamic variable order', () => {
			const draft: IVariableFetchStoreState = {
				states: { dyn1: 'waiting' },
				lastUpdated: {},
				cycleIds: {},
			};

			unlockWaitingDynamicVariables(draft, []);

			expect(draft.states.dyn1).toBe('waiting');
		});
	});
});
