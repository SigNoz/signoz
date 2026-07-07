import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../../../DashboardSettings/Variables/variableFormModel';
import { deriveFetchContext } from '../../../VariablesBar/variableDependencies';
import { useDashboardStore } from '../../useDashboardStore';
import { VariableFetchState } from '../variableFetchSlice.utils';

function model(overrides: Partial<VariableFormModel>): VariableFormModel {
	return { ...emptyVariableFormModel(), ...overrides };
}

// q1 (root query) → q2 (query referencing $q1) ; d1 (dynamic).
const q1 = model({ name: 'q1', type: 'QUERY', queryValue: 'SELECT 1' });
const q2 = model({ name: 'q2', type: 'QUERY', queryValue: 'SELECT $q1' });
const d1 = model({ name: 'd1', type: 'DYNAMIC', dynamicAttribute: 'pod' });
const context = deriveFetchContext([q1, q2, d1]);

function store(): ReturnType<typeof useDashboardStore.getState> {
	return useDashboardStore.getState();
}
function states(): Record<string, string> {
	return store().variableFetchStates;
}

beforeEach(() => {
	useDashboardStore.setState({
		variableFetchStates: {},
		variableLastUpdated: {},
		variableCycleIds: {},
		variableFetchContext: null,
	});
	store().initVariableFetch(['q1', 'q2', 'd1'], context);
});

describe('variableFetchSlice', () => {
	it('initializes every variable to idle', () => {
		expect(states()).toStrictEqual({
			q1: VariableFetchState.Idle,
			q2: VariableFetchState.Idle,
			d1: VariableFetchState.Idle,
		});
	});

	it('enqueueFetchAll loads roots, waits dependents and (ungated) dynamics', () => {
		store().enqueueFetchAll(false);
		expect(states()).toStrictEqual({
			q1: VariableFetchState.Loading,
			q2: VariableFetchState.Waiting,
			d1: VariableFetchState.Waiting,
		});
		expect(store().variableCycleIds).toStrictEqual({ q1: 1, q2: 1, d1: 1 });
	});

	it('enqueueFetchAll loads dynamics immediately when query values exist', () => {
		store().enqueueFetchAll(true);
		expect(states().d1).toBe(VariableFetchState.Loading);
	});

	it('completing a parent unblocks its query child, then unlocks dynamics', () => {
		store().enqueueFetchAll(false);
		store().onVariableFetchComplete('q1');
		expect(states()).toMatchObject({
			q1: VariableFetchState.Idle,
			q2: VariableFetchState.Loading,
			d1: VariableFetchState.Waiting,
		});

		store().onVariableFetchComplete('q2');
		expect(states()).toMatchObject({
			q1: VariableFetchState.Idle,
			q2: VariableFetchState.Idle,
			d1: VariableFetchState.Loading,
		});
	});

	it('enqueueDescendants revalidates only descendants + dynamics', () => {
		store().enqueueFetchAll(false);
		store().onVariableFetchComplete('q1');
		store().onVariableFetchComplete('q2');
		store().onVariableFetchComplete('d1');

		store().enqueueDescendants('q1');
		// q2 depends on q1 (settled) → revalidates; d1 waits (q2 no longer settled).
		expect(states().q2).toBe(VariableFetchState.Revalidating);
		expect(states().d1).toBe(VariableFetchState.Waiting);
	});

	it('enqueueDescendantsBatch bumps each descendant + dynamic exactly once', () => {
		store().enqueueFetchAll(false);
		store().onVariableFetchComplete('q1');
		store().onVariableFetchComplete('q2');
		store().onVariableFetchComplete('d1');
		const before = { ...store().variableCycleIds };

		// q1 and q2 auto-select together: q2 is a descendant of q1 but is also in
		// the batch — it should still bump only once, as should the dynamic.
		store().enqueueDescendantsBatch(['q1', 'q2']);
		const after = store().variableCycleIds;
		expect(after.q2).toBe(before.q2 + 1);
		expect(after.d1).toBe(before.d1 + 1);
	});

	it('a failed parent idles its query descendants', () => {
		store().enqueueFetchAll(false);
		store().onVariableFetchFailure('q1');
		expect(states().q1).toBe(VariableFetchState.Error);
		expect(states().q2).toBe(VariableFetchState.Idle);
	});
});
