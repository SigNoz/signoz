import { QueryClient, QueryClientProvider } from 'react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { rest, server } from 'mocks-server/server';

import { LLM_PRICING_RULE_ENDPOINT } from '../../../__tests__/fixtures';
import { useModelCostDelete } from '../useModelCostDelete';

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: {
		success: (...args: unknown[]): void => toastSuccess(...args),
		error: (...args: unknown[]): void => toastError(...args),
	},
}));

function createWrapper(): ({
	children,
}: {
	children: React.ReactNode;
}) => React.ReactElement {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return function Wrapper({
		children,
	}: {
		children: React.ReactNode;
	}): React.ReactElement {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
}

function renderUseModelCostDelete(): ReturnType<
	typeof renderHook<ReturnType<typeof useModelCostDelete>, unknown>
> {
	return renderHook(() => useModelCostDelete(), { wrapper: createWrapper() });
}

const PENDING = { id: 'rule-openai', modelName: 'gpt-4o' };

describe('useModelCostDelete', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('starts with no pending delete', () => {
		const { result } = renderUseModelCostDelete();

		expect(result.current.pendingDelete).toBeNull();
	});

	it('requestDelete queues the rule for deletion', () => {
		const { result } = renderUseModelCostDelete();

		act(() => {
			result.current.requestDelete(PENDING);
		});

		expect(result.current.pendingDelete).toStrictEqual(PENDING);
	});

	it('cancelDelete clears the pending delete', () => {
		const { result } = renderUseModelCostDelete();

		act(() => {
			result.current.requestDelete(PENDING);
		});
		act(() => {
			result.current.cancelDelete();
		});

		expect(result.current.pendingDelete).toBeNull();
	});

	it('confirmDelete success fires the DELETE, clears state and toasts success', async () => {
		let deletedId: string | null = null;
		server.use(
			rest.delete(LLM_PRICING_RULE_ENDPOINT, (req, res, ctx) => {
				deletedId = req.params.id as string;
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);
		const { result } = renderUseModelCostDelete();

		act(() => {
			result.current.requestDelete(PENDING);
		});
		await act(async () => {
			await result.current.confirmDelete();
		});

		await waitFor(() => expect(deletedId).toBe('rule-openai'));
		await waitFor(() => expect(result.current.pendingDelete).toBeNull());
		expect(toastSuccess).toHaveBeenCalledWith('Model cost deleted');
	});

	it('confirmDelete failure keeps the pending delete and toasts an error', async () => {
		server.use(
			rest.delete(LLM_PRICING_RULE_ENDPOINT, (_req, res, ctx) =>
				res(ctx.status(500)),
			),
		);
		const { result } = renderUseModelCostDelete();

		act(() => {
			result.current.requestDelete(PENDING);
		});
		await act(async () => {
			await result.current.confirmDelete();
		});

		await waitFor(() => expect(toastError).toHaveBeenCalled());
		expect(result.current.pendingDelete).toStrictEqual(PENDING);
		expect(toastSuccess).not.toHaveBeenCalled();
	});
});
