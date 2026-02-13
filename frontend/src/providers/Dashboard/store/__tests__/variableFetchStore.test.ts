import * as dashboardVariablesStore from '../dashboardVariables/dashboardVariablesStore';
import { IDependencyData } from '../dashboardVariables/dashboardVariablesStoreTypes';
import {
	enqueueDescendantsOfVariable,
	enqueueFetchOfAllVariables,
	initializeVariableFetchStore,
	onVariableFetchComplete,
	onVariableFetchFailure,
	VariableFetchContext,
	variableFetchStore,
} from '../variableFetchStore';

const getVariableDependencyContextSpy = jest.spyOn(
	dashboardVariablesStore,
	'getVariableDependencyContext',
);

function resetStore(): void {
	variableFetchStore.set(() => ({
		states: {},
		lastUpdated: {},
		cycleIds: {},
	}));
}

function mockContext(overrides: Partial<VariableFetchContext> = {}): void {
	getVariableDependencyContextSpy.mockReturnValue({
		doAllVariablesHaveValuesSelected: false,
		variableTypes: {},
		dynamicVariableOrder: [],
		dependencyData: null,
		...overrides,
	});
}

/**
 * Helper to build a dependency data object for tests.
 * Only the fields used by the store actions are required.
 */
function buildDependencyData(
	overrides: Partial<IDependencyData> = {},
): IDependencyData {
	return {
		order: [],
		graph: {},
		parentDependencyGraph: {},
		transitiveDescendants: {},
		hasCycle: false,
		...overrides,
	};
}

describe('variableFetchStore', () => {
	beforeEach(() => {
		resetStore();
		jest.clearAllMocks();
	});

	// ==================== initializeVariableFetchStore ====================

	describe('initializeVariableFetchStore', () => {
		it('should initialize new variables to idle', () => {
			initializeVariableFetchStore(['a', 'b', 'c']);

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states).toEqual({ a: 'idle', b: 'idle', c: 'idle' });
		});

		it('should preserve existing states for known variables', () => {
			// Pre-set a state
			variableFetchStore.update((d) => {
				d.states.a = 'loading';
			});

			initializeVariableFetchStore(['a', 'b']);

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.a).toBe('loading');
			expect(storeSnapshot.states.b).toBe('idle');
		});

		it('should clean up stale variables that no longer exist', () => {
			variableFetchStore.update((d) => {
				d.states.old = 'idle';
				d.lastUpdated.old = 100;
				d.cycleIds.old = 3;
			});

			initializeVariableFetchStore(['a']);

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.old).toBeUndefined();
			expect(storeSnapshot.lastUpdated.old).toBeUndefined();
			expect(storeSnapshot.cycleIds.old).toBeUndefined();
			expect(storeSnapshot.states.a).toBe('idle');
		});

		it('should handle empty variable names array', () => {
			variableFetchStore.update((d) => {
				d.states.a = 'idle';
			});

			initializeVariableFetchStore([]);

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states).toEqual({});
		});
	});

	// ==================== enqueueFetchOfAllVariables ====================

	describe('enqueueFetchOfAllVariables', () => {
		it('should no-op when dependencyData is null', () => {
			mockContext({ dependencyData: null });

			initializeVariableFetchStore(['a']);
			enqueueFetchOfAllVariables();

			expect(variableFetchStore.getSnapshot().states.a).toBe('idle');
		});

		it('should set root query variables to loading and dependent ones to waiting', () => {
			// a is root (no parents), b depends on a
			mockContext({
				dependencyData: buildDependencyData({
					order: ['a', 'b'],
					parentDependencyGraph: { a: [], b: ['a'] },
				}),
				variableTypes: { a: 'QUERY', b: 'QUERY' },
			});

			initializeVariableFetchStore(['a', 'b']);
			enqueueFetchOfAllVariables();

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.a).toBe('loading');
			expect(storeSnapshot.states.b).toBe('waiting');
		});

		it('should set root query variables to revalidating when previously fetched', () => {
			mockContext({
				dependencyData: buildDependencyData({
					order: ['a'],
					parentDependencyGraph: { a: [] },
				}),
				variableTypes: { a: 'QUERY' },
			});

			// Pre-set lastUpdated so it appears previously fetched
			variableFetchStore.update((d) => {
				d.lastUpdated.a = 1000;
			});

			initializeVariableFetchStore(['a']);
			enqueueFetchOfAllVariables();

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.a).toBe('revalidating');
		});

		it('should bump cycle IDs for all enqueued variables', () => {
			mockContext({
				dependencyData: buildDependencyData({
					order: ['a', 'b'],
					parentDependencyGraph: { a: [], b: ['a'] },
				}),
				variableTypes: { a: 'QUERY', b: 'QUERY' },
			});

			initializeVariableFetchStore(['a', 'b']);
			enqueueFetchOfAllVariables();

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.cycleIds.a).toBe(1);
			expect(storeSnapshot.cycleIds.b).toBe(1);
		});

		it('should set dynamic variables to waiting when not all variables have values', () => {
			mockContext({
				doAllVariablesHaveValuesSelected: false,
				dependencyData: buildDependencyData({ order: [] }),
				variableTypes: { dyn1: 'DYNAMIC' },
				dynamicVariableOrder: ['dyn1'],
			});

			initializeVariableFetchStore(['dyn1']);
			enqueueFetchOfAllVariables();

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.dyn1).toBe('waiting');
		});

		it('should set dynamic variables to loading when all variables have values', () => {
			mockContext({
				doAllVariablesHaveValuesSelected: true,
				dependencyData: buildDependencyData({ order: [] }),
				variableTypes: { dyn1: 'DYNAMIC' },
				dynamicVariableOrder: ['dyn1'],
			});

			initializeVariableFetchStore(['dyn1']);
			enqueueFetchOfAllVariables();

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.dyn1).toBe('loading');
		});

		it('should not treat non-QUERY parents as query parents', () => {
			// b has a CUSTOM parent — shouldn't cause waiting
			mockContext({
				dependencyData: buildDependencyData({
					order: ['b'],
					parentDependencyGraph: { b: ['customVar'] },
				}),
				variableTypes: { b: 'QUERY', customVar: 'CUSTOM' },
			});

			initializeVariableFetchStore(['b', 'customVar']);
			enqueueFetchOfAllVariables();

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.b).toBe('loading');
		});
	});

	// ==================== onVariableFetchComplete ====================

	describe('onVariableFetchComplete', () => {
		it('should set the completed variable to idle with a lastUpdated timestamp', () => {
			mockContext();

			variableFetchStore.update((d) => {
				d.states.a = 'loading';
			});

			const before = Date.now();
			onVariableFetchComplete('a');
			const after = Date.now();

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.a).toBe('idle');
			expect(storeSnapshot.lastUpdated.a).toBeGreaterThanOrEqual(before);
			expect(storeSnapshot.lastUpdated.a).toBeLessThanOrEqual(after);
		});

		it('should unblock waiting query-type children', () => {
			mockContext({
				dependencyData: buildDependencyData({
					graph: { a: ['b'] },
				}),
				variableTypes: { a: 'QUERY', b: 'QUERY' },
			});

			variableFetchStore.update((d) => {
				d.states.a = 'loading';
				d.states.b = 'waiting';
			});

			onVariableFetchComplete('a');

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.a).toBe('idle');
			expect(storeSnapshot.states.b).toBe('loading');
		});

		it('should not unblock non-QUERY children', () => {
			mockContext({
				dependencyData: buildDependencyData({
					graph: { a: ['dyn1'] },
				}),
				variableTypes: { a: 'QUERY', dyn1: 'DYNAMIC' },
			});

			variableFetchStore.update((d) => {
				d.states.a = 'loading';
				d.states.dyn1 = 'waiting';
			});

			onVariableFetchComplete('a');

			const storeSnapshot = variableFetchStore.getSnapshot();
			// dyn1 is DYNAMIC, not QUERY, so it should remain waiting
			expect(storeSnapshot.states.dyn1).toBe('waiting');
		});

		it('should unlock waiting dynamic variables when all query variables are settled', () => {
			mockContext({
				dependencyData: buildDependencyData({
					graph: { a: [] },
				}),
				variableTypes: { a: 'QUERY', dyn1: 'DYNAMIC' },
				dynamicVariableOrder: ['dyn1'],
			});

			variableFetchStore.update((d) => {
				d.states.a = 'loading';
				d.states.dyn1 = 'waiting';
			});

			onVariableFetchComplete('a');

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.dyn1).toBe('loading');
		});

		it('should NOT unlock dynamic variables if a query variable is still in-flight', () => {
			mockContext({
				dependencyData: buildDependencyData({
					graph: { a: ['b'] },
				}),
				variableTypes: { a: 'QUERY', b: 'QUERY', dyn1: 'DYNAMIC' },
				dynamicVariableOrder: ['dyn1'],
			});

			variableFetchStore.update((d) => {
				d.states.a = 'loading';
				d.states.b = 'waiting';
				d.states.dyn1 = 'waiting';
			});

			onVariableFetchComplete('a');

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.dyn1).toBe('waiting');
		});
	});

	// ==================== onVariableFetchFailure ====================

	describe('onVariableFetchFailure', () => {
		it('should set the failed variable to error', () => {
			mockContext();

			variableFetchStore.update((d) => {
				d.states.a = 'loading';
			});

			onVariableFetchFailure('a');

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.a).toBe('error');
		});

		it('should set query-type transitive descendants to idle', () => {
			mockContext({
				dependencyData: buildDependencyData({
					transitiveDescendants: { a: ['b', 'c'] },
				}),
				variableTypes: { a: 'QUERY', b: 'QUERY', c: 'QUERY' },
			});

			variableFetchStore.update((d) => {
				d.states.a = 'loading';
				d.states.b = 'waiting';
				d.states.c = 'waiting';
			});

			onVariableFetchFailure('a');

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.a).toBe('error');
			expect(storeSnapshot.states.b).toBe('idle');
			expect(storeSnapshot.states.c).toBe('idle');
		});

		it('should not touch non-QUERY descendants', () => {
			mockContext({
				dependencyData: buildDependencyData({
					transitiveDescendants: { a: ['dyn1'] },
				}),
				variableTypes: { a: 'QUERY', dyn1: 'DYNAMIC' },
			});

			variableFetchStore.update((d) => {
				d.states.a = 'loading';
				d.states.dyn1 = 'waiting';
			});

			onVariableFetchFailure('a');

			expect(variableFetchStore.getSnapshot().states.dyn1).toBe('waiting');
		});

		it('should unlock waiting dynamic variables when all query variables settle via error', () => {
			mockContext({
				dependencyData: buildDependencyData({
					transitiveDescendants: {},
				}),
				variableTypes: { a: 'QUERY', dyn1: 'DYNAMIC' },
				dynamicVariableOrder: ['dyn1'],
			});

			variableFetchStore.update((d) => {
				d.states.a = 'loading';
				d.states.dyn1 = 'waiting';
			});

			onVariableFetchFailure('a');

			expect(variableFetchStore.getSnapshot().states.dyn1).toBe('loading');
		});
	});

	// ==================== enqueueDescendantsOfVariable ====================

	describe('enqueueDescendantsOfVariable', () => {
		it('should no-op when dependencyData is null', () => {
			mockContext({ dependencyData: null });

			variableFetchStore.update((d) => {
				d.states.a = 'idle';
				d.states.b = 'idle';
			});

			enqueueDescendantsOfVariable('a');

			expect(variableFetchStore.getSnapshot().states.b).toBe('idle');
		});

		it('should enqueue query-type descendants with all parents settled', () => {
			mockContext({
				dependencyData: buildDependencyData({
					transitiveDescendants: { a: ['b'] },
					parentDependencyGraph: { b: ['a'] },
				}),
				variableTypes: { a: 'QUERY', b: 'QUERY' },
			});

			variableFetchStore.update((d) => {
				d.states.a = 'idle';
				d.states.b = 'idle';
			});

			enqueueDescendantsOfVariable('a');

			const storeSnapshot = variableFetchStore.getSnapshot();
			expect(storeSnapshot.states.b).toBe('loading');
			expect(storeSnapshot.cycleIds.b).toBe(1);
		});

		it('should set descendants to waiting when some parents are not settled', () => {
			// b depends on both a and c; c is still loading
			mockContext({
				dependencyData: buildDependencyData({
					transitiveDescendants: { a: ['b'] },
					parentDependencyGraph: { b: ['a', 'c'] },
				}),
				variableTypes: { a: 'QUERY', b: 'QUERY', c: 'QUERY' },
			});

			variableFetchStore.update((d) => {
				d.states.a = 'idle';
				d.states.b = 'idle';
				d.states.c = 'loading';
			});

			enqueueDescendantsOfVariable('a');

			expect(variableFetchStore.getSnapshot().states.b).toBe('waiting');
		});

		it('should skip non-QUERY descendants', () => {
			mockContext({
				dependencyData: buildDependencyData({
					transitiveDescendants: { a: ['dyn1'] },
					parentDependencyGraph: {},
				}),
				variableTypes: { a: 'QUERY', dyn1: 'DYNAMIC' },
			});

			variableFetchStore.update((d) => {
				d.states.a = 'idle';
				d.states.dyn1 = 'idle';
			});

			enqueueDescendantsOfVariable('a');

			// dyn1 is DYNAMIC, so it should not be touched
			expect(variableFetchStore.getSnapshot().states.dyn1).toBe('idle');
		});

		it('should handle chain of descendants: a -> b -> c', () => {
			// a -> b -> c, all QUERY
			mockContext({
				dependencyData: buildDependencyData({
					transitiveDescendants: { a: ['b', 'c'] },
					parentDependencyGraph: { b: ['a'], c: ['b'] },
				}),
				variableTypes: { a: 'QUERY', b: 'QUERY', c: 'QUERY' },
			});

			variableFetchStore.update((d) => {
				d.states.a = 'idle';
				d.states.b = 'idle';
				d.states.c = 'idle';
			});

			enqueueDescendantsOfVariable('a');

			const storeSnapshot = variableFetchStore.getSnapshot();
			// b's parent (a) is idle/settled → loading
			expect(storeSnapshot.states.b).toBe('loading');
			// c's parent (b) just moved to loading (not settled) → waiting
			expect(storeSnapshot.states.c).toBe('waiting');
		});

		it('should set descendants to revalidating when previously fetched', () => {
			mockContext({
				dependencyData: buildDependencyData({
					transitiveDescendants: { a: ['b'] },
					parentDependencyGraph: { b: ['a'] },
				}),
				variableTypes: { a: 'QUERY', b: 'QUERY' },
			});

			variableFetchStore.update((d) => {
				d.states.a = 'idle';
				d.states.b = 'idle';
				d.lastUpdated.b = 1000;
			});

			enqueueDescendantsOfVariable('a');

			expect(variableFetchStore.getSnapshot().states.b).toBe('revalidating');
		});
	});
});
