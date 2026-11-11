import { ReactNode } from 'react';
import { act, renderHook } from 'tests/test-utils';

import {
	useExpression,
	useInitialExpression,
	useInputExpression,
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

// Back or Forward. nuqs has not caught up yet, so its value is still the old one.
function goTo(expression: string | null): void {
	act(() => {
		const search = expression
			? `?${new URLSearchParams({ testExpression: expression })}`
			: '';
		window.history.pushState(null, '', `/${search}`);
		window.dispatchEvent(new PopStateEvent('popstate'));
	});
}

function useTestHooks(): {
	expression: string;
	userExpression: string;
	initialExpression: string;
	inputExpression: string;
	querySearchInitialExpressionProp: string | undefined;
	onChange: (expr: string) => void;
	onRun: (expr: string) => void;
} {
	return {
		expression: useExpression(),
		userExpression: useUserExpression(),
		initialExpression: useInitialExpression(),
		inputExpression: useInputExpression(),
		querySearchInitialExpressionProp: useQuerySearchInitialExpressionProp(),
		onChange: useQuerySearchOnChange(),
		onRun: useQuerySearchOnRun(),
	};
}

describe('QuerySearchExpressionProvider', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUrlValue = null;
		window.history.replaceState(null, '', '/');
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

	it('follows Back and Forward from the browser URL', () => {
		mockUrlValue = 'status = 500';
		const { result } = renderHook(() => useTestHooks(), {
			wrapper: createWrapper(),
		});

		goTo('status = 404');

		expect(result.current.userExpression).toBe('status = 404');
		expect(mockSetQueryState).not.toHaveBeenCalled();
	});

	it('clears the filter on Back to a URL without the param', () => {
		mockUrlValue = 'status = 500';
		const { result } = renderHook(() => useTestHooks(), {
			wrapper: createWrapper(),
		});

		goTo(null);

		expect(result.current.userExpression).toBe('');
		expect(mockSetQueryState).not.toHaveBeenCalled();
	});

	it('keeps text typed but not run when Back changes another param', () => {
		mockUrlValue = 'status = 500';
		const { result } = renderHook(() => useTestHooks(), {
			wrapper: createWrapper(),
		});
		act(() => {
			result.current.onChange('status = 404');
		});

		goTo('status = 500');

		expect(result.current.inputExpression).toBe('status = 404');
	});

	it('writes a run filter to the URL once and ignores it coming back', () => {
		const { result, rerender } = renderHook(() => useTestHooks(), {
			wrapper: createWrapper(),
		});

		act(() => {
			result.current.onRun('status = 500');
		});
		expect(mockSetQueryState).toHaveBeenCalledTimes(1);
		expect(mockSetQueryState).toHaveBeenLastCalledWith('status = 500');

		mockUrlValue = 'status = 500';
		rerender();

		expect(result.current.userExpression).toBe('status = 500');
		expect(mockSetQueryState).toHaveBeenCalledTimes(1);
	});

	it('keeps a run filter when the URL briefly reports the value it replaced', () => {
		mockUrlValue = 'status = 500';
		const { result, rerender } = renderHook(() => useTestHooks(), {
			wrapper: createWrapper(),
		});

		act(() => {
			result.current.onRun('status = 404');
		});
		mockUrlValue = 'status = 404';
		rerender();
		mockUrlValue = 'status = 500';
		rerender();

		expect(result.current.userExpression).toBe('status = 404');
	});

	it('keeps a newer run when a late URL value arrives after an empty mount', () => {
		const { result, rerender } = renderHook(() => useTestHooks(), {
			wrapper: createWrapper(),
		});

		act(() => {
			result.current.onRun('status = 500');
		});
		act(() => {
			result.current.onRun('status = 404');
		});
		mockUrlValue = 'status = 500';
		rerender();

		expect(result.current.userExpression).toBe('status = 404');
	});

	it('should throw error when used outside provider', () => {
		expect(() => {
			renderHook(() => useExpression());
		}).toThrow(
			'useQuerySearchV2Store must be used within a QuerySearchV2Provider',
		);
	});
});
