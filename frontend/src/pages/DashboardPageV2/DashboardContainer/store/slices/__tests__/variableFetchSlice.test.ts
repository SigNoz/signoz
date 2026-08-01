import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../../../DashboardSettings/Variables/variableFormModel';
import {
	deriveFetchContext,
	type VariableFetchContext,
} from '../../../VariablesBar/utils/variableDependencies';
import { useDashboardStore } from '../../useDashboardStore';

function model(overrides: Partial<VariableFormModel>): VariableFormModel {
	return { ...emptyVariableFormModel(), ...overrides };
}

const DASH = 'test-dash';

function store(): ReturnType<typeof useDashboardStore.getState> {
	return useDashboardStore.getState();
}
function states(): Record<string, string> {
	return store().variableFetchStates;
}
/** Commit a value for a variable (what a parent must have before a child fetches). */
function resolve(name: string): void {
	store().setVariableValue(DASH, name, {
		value: `${name}-v`,
		allSelected: false,
	});
}
function reset(names: string[], context: VariableFetchContext): void {
	useDashboardStore.setState({
		dashboardId: DASH,
		variableValues: {},
		variableFetchStates: {},
		variableLastUpdated: {},
		variableCycleIds: {},
		variableFetchContext: null,
	});
	store().initVariableFetch(names, context);
}

describe('variableFetchSlice', () => {
	// q1 (root query) → q2 (query referencing $q1) ; d1, d2 (dynamics).
	const q1 = model({ name: 'q1', type: 'QUERY', queryValue: 'SELECT 1' });
	const q2 = model({ name: 'q2', type: 'QUERY', queryValue: 'SELECT $q1' });
	const d1 = model({ name: 'd1', type: 'DYNAMIC', dynamicAttribute: 'pod' });
	const d2 = model({ name: 'd2', type: 'DYNAMIC', dynamicAttribute: 'ns' });
	const context = deriveFetchContext([q1, q2, d1, d2]);

	beforeEach(() => reset(['q1', 'q2', 'd1', 'd2'], context));

	it('initializes every variable to idle', () => {
		expect(states()).toStrictEqual({
			q1: 'idle',
			q2: 'idle',
			d1: 'idle',
			d2: 'idle',
		});
	});

	it('loads query roots + dynamics immediately and waits query dependents', () => {
		store().enqueueFetchAll();
		// Dynamics fetch immediately (not gated on the query chain); the query
		// dependent q2 waits for its parent q1.
		expect(states()).toMatchObject({
			q1: 'loading',
			q2: 'waiting',
			d1: 'loading',
			d2: 'loading',
		});
	});

	it('a completed parent alone does not unblock the child; its committed value does', () => {
		store().enqueueFetchAll();
		store().onVariableFetchComplete('q1');
		// q1 finished fetching but has not auto-selected a value yet, so q2 holds
		// rather than fetching with q1 unresolved. Dynamics load regardless.
		expect(states()).toMatchObject({ q1: 'idle', q2: 'waiting', d1: 'loading' });
		// q1's value commits → the value cascade unblocks q2.
		resolve('q1');
		store().enqueueDescendants('q1');
		expect(states().q2).not.toBe('waiting');
	});

	it('unblocks a query child immediately when its parent already has a value', () => {
		// Persisted/pre-seeded selection: q1 has a value before it even fetches, so
		// completing its fetch unblocks q2 straight away (a single fetch, no cascade).
		resolve('q1');
		store().enqueueFetchAll();
		store().onVariableFetchComplete('q1');
		expect(states().q2).not.toBe('waiting');
	});

	it('ignores a settle for a variable that is not actively fetching', () => {
		// q1 was never enqueued (still idle) — a stray complete must be a no-op.
		store().onVariableFetchComplete('q1');
		expect(states().q1).toBe('idle');
		expect(store().variableLastUpdated.q1 ?? 0).toBe(0);
	});

	it('changing a query variable revalidates query descendants but NOT dynamics', () => {
		// Drive the chain to a fully settled state: q1 fetched + valued, q2 fetched.
		store().enqueueFetchAll();
		store().onVariableFetchComplete('q1');
		resolve('q1');
		store().enqueueDescendants('q1');
		store().onVariableFetchComplete('q2');
		resolve('q2');
		['d1', 'd2'].forEach((n) => store().onVariableFetchComplete(n));
		const before = { ...store().variableCycleIds };

		store().enqueueDescendants('q1');
		expect(states().q2).toBe('revalidating');
		expect(store().variableCycleIds.q2).toBe(before.q2 + 1);
		expect(store().variableCycleIds.d1).toBe(before.d1);
		expect(store().variableCycleIds.d2).toBe(before.d2);
	});

	it('changing a dynamic refreshes the OTHER dynamics, never itself or query vars', () => {
		store().enqueueFetchAll();
		['q1', 'q2', 'd1', 'd2'].forEach((n) => store().onVariableFetchComplete(n));
		const before = { ...store().variableCycleIds };

		store().enqueueDescendants('d1');
		expect(store().variableCycleIds.d1).toBe(before.d1);
		expect(store().variableCycleIds.d2).toBe(before.d2 + 1);
		expect(store().variableCycleIds.q1).toBe(before.q1);
	});

	it('a failed parent idles its query descendants', () => {
		store().enqueueFetchAll();
		store().onVariableFetchFailure('q1');
		expect(states().q1).toBe('error');
		expect(states().q2).toBe('idle');
	});
});

describe('variableFetchSlice — query depends on a dynamic', () => {
	// qd (query) references $dyn (a dynamic variable).
	const dyn = model({ name: 'dyn', type: 'DYNAMIC', dynamicAttribute: 'pod' });
	const qd = model({ name: 'qd', type: 'QUERY', queryValue: 'SELECT $dyn' });
	const context = deriveFetchContext([dyn, qd]);

	beforeEach(() => reset(['dyn', 'qd'], context));

	it('does not wait for a dynamic parent — both load immediately', () => {
		store().enqueueFetchAll();
		// A dynamic's selected value is already in the selection, so the dependent
		// query never waits on the dynamic's option fetch; both start together.
		expect(states()).toMatchObject({ dyn: 'loading', qd: 'loading' });
	});
});

describe('variableFetchSlice — diamond dependencies', () => {
	// qA, qB (roots) → qC (references both $qA and $qB).
	const qA = model({ name: 'qA', type: 'QUERY', queryValue: 'SELECT 1' });
	const qB = model({ name: 'qB', type: 'QUERY', queryValue: 'SELECT 2' });
	const qC = model({ name: 'qC', type: 'QUERY', queryValue: 'SELECT $qA $qB' });
	const context = deriveFetchContext([qA, qB, qC]);

	beforeEach(() => reset(['qA', 'qB', 'qC'], context));

	it('unblocks the child only once BOTH parents have committed values', () => {
		store().enqueueFetchAll();
		expect(states().qC).toBe('waiting');

		store().onVariableFetchComplete('qA');
		resolve('qA');
		store().enqueueDescendants('qA');
		expect(states().qC).toBe('waiting'); // qB has no value yet

		store().onVariableFetchComplete('qB');
		resolve('qB');
		store().enqueueDescendants('qB');
		expect(states().qC).not.toBe('waiting'); // both valued → fetches
	});
});

describe('variableFetchSlice — dependency cycle', () => {
	// qX ↔ qY reference each other → dropped from the topological order.
	const qX = model({ name: 'qX', type: 'QUERY', queryValue: 'SELECT $qY' });
	const qY = model({ name: 'qY', type: 'QUERY', queryValue: 'SELECT $qX' });
	const context = deriveFetchContext([qX, qY]);

	beforeEach(() => reset(['qX', 'qY'], context));

	it('enqueues cyclic query variables as best-effort roots (not silently idle)', () => {
		store().enqueueFetchAll();
		expect(states().qX).not.toBe('idle');
		expect(states().qY).not.toBe('idle');
	});
});
