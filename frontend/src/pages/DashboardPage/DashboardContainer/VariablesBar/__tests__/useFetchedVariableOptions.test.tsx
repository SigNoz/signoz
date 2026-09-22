// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { getFieldValues } from 'api/dynamicVariables/getFieldValues';

import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../../DashboardSettings/Variables/variableFormModel';
import { VariableFetchState } from '../../store/slices/variableFetchSlice';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useFetchedVariableOptions } from '../hooks/useFetchedVariableOptions';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));

jest.mock('api/dynamicVariables/getFieldValues', () => ({
	getFieldValues: jest.fn(),
}));

const mockUseSelector = useSelector as unknown as jest.Mock;
const mockGetFieldValues = getFieldValues as unknown as jest.Mock;

function fieldValues(values: string[]): unknown {
	return { data: { normalizedValues: values, complete: true } };
}

/** A promise resolved by the test, so the in-flight window is deterministic. */
function deferred(): {
	promise: Promise<unknown>;
	resolve: (value: unknown) => void;
} {
	let settle: (value: unknown) => void = () => {};
	const promise = new Promise<unknown>((resolve) => {
		settle = resolve;
	});
	return { promise, resolve: settle };
}

function dynamicVariable(name: string): VariableFormModel {
	return {
		...emptyVariableFormModel(),
		name,
		type: 'DYNAMIC',
		dynamicAttribute: 'service.name',
	};
}

function wrapper({ children }: { children: React.ReactNode }): JSX.Element {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useFetchedVariableOptions', () => {
	beforeEach(() => {
		mockUseSelector.mockImplementation((selector: (state: unknown) => unknown) =>
			selector({
				globalTime: {
					minTime: 1_000,
					maxTime: 2_000,
					isAutoRefreshDisabled: true,
				},
			}),
		);
	});

	afterEach(() => {
		mockGetFieldValues.mockReset();
		useDashboardStore.setState({
			variableFetchStates: {},
			variableLastUpdated: {},
			variableCycleIds: {},
			variableResolvedEmpty: {},
		});
	});

	it('keeps the previous options while a new fetch cycle is in flight', async () => {
		const refetch = deferred();
		mockGetFieldValues
			.mockResolvedValueOnce(fieldValues(['prod', 'staging']))
			.mockReturnValueOnce(refetch.promise);

		useDashboardStore.setState({
			variableFetchStates: { env: VariableFetchState.Loading },
			variableCycleIds: { env: 1 },
		});

		const variable = dynamicVariable('env');
		const { result } = renderHook(
			() => useFetchedVariableOptions(variable, [variable], {}),
			{ wrapper },
		);

		await waitFor(() =>
			expect(result.current.options).toStrictEqual(['prod', 'staging']),
		);

		// What a sibling dynamic's selection change does: bump the cycle id, which keys
		// a fresh request. The options must not blink empty in the meantime, or an ALL
		// selection (rendered from them) falls back to the placeholder.
		act(() => {
			useDashboardStore.setState({ variableCycleIds: { env: 2 } });
		});

		await waitFor(() => expect(result.current.loading).toBe(true));
		expect(result.current.options).toStrictEqual(['prod', 'staging']);

		await act(async () => {
			refetch.resolve(fieldValues(['prod']));
			await refetch.promise;
		});

		await waitFor(() => expect(result.current.options).toStrictEqual(['prod']));
	});

	it('keeps related values as their own section and as selectable options', async () => {
		mockGetFieldValues.mockResolvedValue({
			data: {
				normalizedValues: ['cart', 'payments'],
				relatedValues: ['checkout'],
				complete: true,
			},
		});

		useDashboardStore.setState({
			variableFetchStates: { env: VariableFetchState.Loading },
			variableCycleIds: { env: 1 },
		});

		const variable = dynamicVariable('env');
		const { result } = renderHook(
			() => useFetchedVariableOptions(variable, [variable], {}),
			{ wrapper },
		);

		await waitFor(() =>
			expect(result.current.dynamic?.relatedValues).toStrictEqual(['checkout']),
		);
		expect(result.current.dynamic?.values).toStrictEqual(['cart', 'payments']);
		// A related value the unscoped list never returned is still selectable.
		expect(result.current.options).toStrictEqual([
			'cart',
			'payments',
			'checkout',
		]);
	});
	it('sends the search to the API when the list is incomplete', async () => {
		mockGetFieldValues.mockImplementation((_signal, _name, searchText) =>
			Promise.resolve({
				data: searchText
					? { normalizedValues: ['payments'], relatedValues: [], complete: false }
					: { normalizedValues: ['cart'], relatedValues: [], complete: false },
			}),
		);

		useDashboardStore.setState({
			variableFetchStates: { env: VariableFetchState.Loading },
			variableCycleIds: { env: 1 },
		});

		const variable = dynamicVariable('env');
		const { result } = renderHook(
			() => useFetchedVariableOptions(variable, [variable], {}),
			{ wrapper },
		);

		await waitFor(() =>
			expect(result.current.dynamic?.values).toStrictEqual(['cart']),
		);

		act(() => {
			result.current.dynamic?.onSearch('pay');
		});

		await waitFor(() =>
			expect(result.current.dynamic?.values).toStrictEqual(['payments']),
		);
		expect(mockGetFieldValues).toHaveBeenCalledWith(
			undefined,
			'service.name',
			'pay',
			1_000,
			2_000,
			undefined,
			expect.anything(),
		);
		// The search narrows the dropdown only — the selectable set is the full list,
		// so a pick made before searching is never reconciled away.
		expect(result.current.options).toStrictEqual(['cart']);

		act(() => {
			result.current.dynamic?.onSearchReset();
		});

		await waitFor(() =>
			expect(result.current.dynamic?.values).toStrictEqual(['cart']),
		);
	});
	it('scopes the fetch by a sibling dynamic selection, skipping ALL', async () => {
		mockGetFieldValues.mockResolvedValue(fieldValues(['cart']));

		useDashboardStore.setState({
			variableFetchStates: { env: VariableFetchState.Loading },
			variableCycleIds: { env: 1 },
		});

		const env = dynamicVariable('env');
		const namespace: VariableFormModel = {
			...dynamicVariable('namespace'),
			dynamicAttribute: 'k8s.namespace.name',
		};
		const region: VariableFormModel = {
			...dynamicVariable('region'),
			dynamicAttribute: 'cloud.region',
		};

		renderHook(
			() =>
				useFetchedVariableOptions(env, [env, namespace, region], {
					namespace: { value: ['prod'], allSelected: false },
					// ALL means "no filter", so it contributes nothing to existingQuery —
					// which is why the backend returns no related values for it.
					region: { value: null, allSelected: true },
				}),
			{ wrapper },
		);

		await waitFor(() =>
			expect(mockGetFieldValues).toHaveBeenCalledWith(
				undefined,
				'service.name',
				undefined,
				1_000,
				2_000,
				"k8s.namespace.name = 'prod'",
			),
		);
	});
});
