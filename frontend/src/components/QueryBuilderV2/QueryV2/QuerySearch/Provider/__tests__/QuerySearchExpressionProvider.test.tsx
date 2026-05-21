import { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';

import {
	useExpression,
	useInitialExpression,
	useQuerySearchInitialExpressionProp,
	useQuerySearchOnChange,
	useQuerySearchOnRun,
	useUserExpression,
} from '../context';
import {
	QuerySearchV2Provider,
	QuerySearchV2ProviderProps,
} from '../QuerySearchV2.provider';

const mockSetQueryState = jest.fn();
let mockUrlValue: string | null = null;

jest.mock('nuqs', () => ({
	parseAsString: {},
	useQueryState: jest.fn(() => [mockUrlValue, mockSetQueryState]),
}));

function createWrapper(
	props: Partial<QuerySearchV2ProviderProps> = {},
): ({ children }: { children: ReactNode }) => JSX.Element {
	return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<QuerySearchV2Provider queryParamKey="testExpression" {...props}>
				{children}
			</QuerySearchV2Provider>
		);
	};
}

function useTestHooks(): {
	expression: string;
	userExpression: string;
	initialExpression: string;
	querySearchInitialExpressionProp: string | undefined;
	onChange: (expr: string) => void;
	onRun: (expr: string) => void;
} {
	return {
		expression: useExpression(),
		userExpression: useUserExpression(),
		initialExpression: useInitialExpression(),
		querySearchInitialExpressionProp: useQuerySearchInitialExpressionProp(),
		onChange: useQuerySearchOnChange(),
		onRun: useQuerySearchOnRun(),
	};
}

describe('QuerySearchExpressionProvider', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUrlValue = null;
	});

	it('should provide initial context values', () => {
		const { result } = renderHook(() => useTestHooks(), {
			wrapper: createWrapper(),
		});

		expect(result.current.expression).toBe('');
		expect(result.current.userExpression).toBe('');
		expect(result.current.initialExpression).toBe('');
	});

	it('should combine initialExpression with userExpression', () => {
		const { result } = renderHook(() => useTestHooks(), {
			wrapper: createWrapper({ initialExpression: 'k8s.pod.name = "my-pod"' }),
		});

		expect(result.current.expression).toBe('k8s.pod.name = "my-pod"');
		expect(result.current.initialExpression).toBe('k8s.pod.name = "my-pod"');

		act(() => {
			result.current.onChange('service = "api"');
		});
		act(() => {
			result.current.onRun('service = "api"');
		});

		expect(result.current.expression).toBe(
			'k8s.pod.name = "my-pod" AND (service = "api")',
		);
		expect(result.current.userExpression).toBe('service = "api"');
	});

	it('should provide querySearchProps with correct callbacks', () => {
		const { result } = renderHook(() => useTestHooks(), {
			wrapper: createWrapper({ initialExpression: 'initial' }),
		});

		expect(result.current.querySearchInitialExpressionProp).toBe('initial');
		expect(typeof result.current.onChange).toBe('function');
		expect(typeof result.current.onRun).toBe('function');
	});

	it('should initialize from URL value on mount', () => {
		mockUrlValue = 'status = 500';

		const { result } = renderHook(() => useTestHooks(), {
			wrapper: createWrapper(),
		});

		expect(result.current.userExpression).toBe('status = 500');
		expect(result.current.expression).toBe('status = 500');
	});

	it('should throw error when used outside provider', () => {
		expect(() => {
			renderHook(() => useExpression());
		}).toThrow(
			'useQuerySearchV2Store must be used within a QuerySearchV2Provider',
		);
	});
});
