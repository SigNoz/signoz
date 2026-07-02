import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../../../DashboardSettings/Variables/variableFormModel';
import { deriveFetchContext } from '../../../VariablesBar/variableDependencies';
import { useDashboardStore } from '../../useDashboardStore';

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
		expect(states()).toStrictEqual({ q1: 'idle', q2: 'idle', d1: 'idle' });
	});

	it('enqueueFetchAll loads roots, waits dependents and (ungated) dynamics', () => {
		store().enqueueFetchAll(false);
		expect(states()).toStrictEqual({
			q1: 'loading',
			q2: 'waiting',
			d1: 'waiting',
		});
		expect(store().variableCycleIds).toStrictEqual({ q1: 1, q2: 1, d1: 1 });
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
		expect(states()).toMatchObject({ q1: 'idle', q2: 'idle', d1: 'loading' });
	});

	it('enqueueDescendants revalidates only descendants + dynamics', () => {
		store().enqueueFetchAll(false);
		store().onVariableFetchComplete('q1');
		store().onVariableFetchComplete('q2');
		store().onVariableFetchComplete('d1');

		store().enqueueDescendants('q1');
		// q2 depends on q1 (settled) → revalidates; d1 waits (q2 no longer settled).
		expect(states().q2).toBe('revalidating');
		expect(states().d1).toBe('waiting');
	});

	it('a failed parent idles its query descendants', () => {
		store().enqueueFetchAll(false);
		store().onVariableFetchFailure('q1');
		expect(states().q1).toBe('error');
		expect(states().q2).toBe('idle');
	});
});
