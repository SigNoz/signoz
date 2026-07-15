import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../../../DashboardSettings/Variables/variableFormModel';
import {
	deriveFetchContext,
	type VariableFetchContext,
} from '../../../VariablesBar/variableDependencies';
import { useDashboardStore } from '../../useDashboardStore';

function model(overrides: Partial<VariableFormModel>): VariableFormModel {
	return { ...emptyVariableFormModel(), ...overrides };
}

function store(): ReturnType<typeof useDashboardStore.getState> {
	return useDashboardStore.getState();
}
function states(): Record<string, string> {
	return store().variableFetchStates;
}
function reset(names: string[], context: VariableFetchContext): void {
	useDashboardStore.setState({
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

	it('enqueueFetchAll loads roots, waits dependents and (ungated) dynamics', () => {
		store().enqueueFetchAll(false);
		expect(states()).toMatchObject({
			q1: 'loading',
			q2: 'waiting',
			d1: 'waiting',
			d2: 'waiting',
		});
	});

	it('enqueueFetchAll loads dynamics immediately when query values exist', () => {
		store().enqueueFetchAll(true);
		expect(states().d1).toBe('loading');
	});

	it('completing a parent unblocks its query child, then unlocks dynamics', () => {
		store().enqueueFetchAll(false);
		store().onVariableFetchComplete('q1');
		expect(states()).toMatchObject({ q1: 'idle', q2: 'loading', d1: 'waiting' });

		store().onVariableFetchComplete('q2');
		expect(states()).toMatchObject({ q2: 'idle', d1: 'loading', d2: 'loading' });
	});

	it('ignores a settle for a variable that is not actively fetching', () => {
		// q1 was never enqueued (still idle) — a stray complete must be a no-op.
		store().onVariableFetchComplete('q1');
		expect(states().q1).toBe('idle');
		expect(store().variableLastUpdated.q1 ?? 0).toBe(0);
	});

	it('changing a query variable revalidates query descendants but NOT dynamics', () => {
		store().enqueueFetchAll(true);
		['q1', 'q2', 'd1', 'd2'].forEach((n) => store().onVariableFetchComplete(n));
		const before = { ...store().variableCycleIds };

		store().enqueueDescendants('q1');
		expect(states().q2).toBe('revalidating');
		expect(store().variableCycleIds.q2).toBe(before.q2 + 1);
		expect(store().variableCycleIds.d1).toBe(before.d1);
		expect(store().variableCycleIds.d2).toBe(before.d2);
	});

	it('changing a dynamic refreshes the OTHER dynamics, never itself or query vars', () => {
		store().enqueueFetchAll(true);
		['q1', 'q2', 'd1', 'd2'].forEach((n) => store().onVariableFetchComplete(n));
		const before = { ...store().variableCycleIds };

		store().enqueueDescendants('d1');
		expect(store().variableCycleIds.d1).toBe(before.d1);
		expect(store().variableCycleIds.d2).toBe(before.d2 + 1);
		expect(store().variableCycleIds.q1).toBe(before.q1);
	});

	it('a failed parent idles its query descendants', () => {
		store().enqueueFetchAll(false);
		store().onVariableFetchFailure('q1');
		expect(states().q1).toBe('error');
		expect(states().q2).toBe('idle');
	});
});

describe('variableFetchSlice — diamond dependencies', () => {
	// qA, qB (roots) → qC (references both $qA and $qB).
	const qA = model({ name: 'qA', type: 'QUERY', queryValue: 'SELECT 1' });
	const qB = model({ name: 'qB', type: 'QUERY', queryValue: 'SELECT 2' });
	const qC = model({ name: 'qC', type: 'QUERY', queryValue: 'SELECT $qA $qB' });
	const context = deriveFetchContext([qA, qB, qC]);

	beforeEach(() => reset(['qA', 'qB', 'qC'], context));

	it('unblocks the child only once BOTH parents are settled', () => {
		store().enqueueFetchAll(false);
		expect(states().qC).toBe('waiting');

		store().onVariableFetchComplete('qA');
		expect(states().qC).toBe('waiting'); // qB still loading

		store().onVariableFetchComplete('qB');
		expect(states().qC).not.toBe('waiting'); // both settled → fetches
	});
});

describe('variableFetchSlice — dependency cycle', () => {
	// qX ↔ qY reference each other → dropped from the topological order.
	const qX = model({ name: 'qX', type: 'QUERY', queryValue: 'SELECT $qY' });
	const qY = model({ name: 'qY', type: 'QUERY', queryValue: 'SELECT $qX' });
	const context = deriveFetchContext([qX, qY]);

	beforeEach(() => reset(['qX', 'qY'], context));

	it('enqueues cyclic query variables as best-effort roots (not silently idle)', () => {
		store().enqueueFetchAll(false);
		expect(states().qX).not.toBe('idle');
		expect(states().qY).not.toBe('idle');
	});
});
