import { QueryClient, QueryClientProvider } from 'react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { rest, server } from 'mocks-server/server';

import { EMPTY_DRAFT } from '../../../../../constants';
import {
	LLM_PRICING_ENDPOINT,
	makePricingRule,
} from '../../../../../__tests__/fixtures';
import { draftFromRule } from '../../../../../utils';
import { useModelCostDrawer } from '../useModelCostDrawer';

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

function renderUseModelCostDrawer(): ReturnType<
	typeof renderHook<ReturnType<typeof useModelCostDrawer>, unknown>
> {
	return renderHook(() => useModelCostDrawer(), { wrapper: createWrapper() });
}

describe('useModelCostDrawer', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('starts closed in add mode with no selected rule', () => {
		const { result } = renderUseModelCostDrawer();

		expect(result.current.isOpen).toBe(false);
		expect(result.current.mode).toBe('add');
		expect(result.current.selectedRuleId).toBeNull();
	});

	it('openForAdd opens the drawer in add mode with the empty draft', () => {
		const { result } = renderUseModelCostDrawer();

		act(() => {
			result.current.openForAdd();
		});

		expect(result.current.isOpen).toBe(true);
		expect(result.current.mode).toBe('add');
		expect(result.current.selectedRuleId).toBeNull();
		expect(result.current.initialDraft).toStrictEqual({
			...EMPTY_DRAFT,
			modelName: '',
			patterns: [],
		});
	});

	it('openForEdit opens the drawer in edit mode prefilled from the rule', () => {
		const rule = makePricingRule({ id: 'rule-edit', modelName: 'gpt-4o' });
		const { result } = renderUseModelCostDrawer();

		act(() => {
			result.current.openForEdit(rule);
		});

		expect(result.current.isOpen).toBe(true);
		expect(result.current.mode).toBe('edit');
		expect(result.current.selectedRuleId).toBe('rule-edit');
		expect(result.current.initialDraft).toStrictEqual(draftFromRule(rule));
	});

	it('close resets the open state and selection', () => {
		const rule = makePricingRule({ id: 'rule-edit' });
		const { result } = renderUseModelCostDrawer();

		act(() => {
			result.current.openForEdit(rule);
		});
		act(() => {
			result.current.close();
		});

		expect(result.current.isOpen).toBe(false);
		expect(result.current.selectedRuleId).toBeNull();
		expect(result.current.saveError).toBeNull();
	});

	it('save success closes the drawer and shows a success toast', async () => {
		server.use(
			rest.put(LLM_PRICING_ENDPOINT, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success' })),
			),
		);
		const { result } = renderUseModelCostDrawer();

		act(() => {
			result.current.openForAdd();
		});

		const draft = { ...EMPTY_DRAFT, modelName: 'gpt-4o' };
		await act(async () => {
			await result.current.save(draft);
		});

		await waitFor(() => expect(result.current.isOpen).toBe(false));
		expect(toastSuccess).toHaveBeenCalledWith('Model cost added');
		expect(result.current.saveError).toBeNull();
	});

	it('save failure sets saveError and keeps the drawer open', async () => {
		server.use(
			rest.put(LLM_PRICING_ENDPOINT, (_req, res, ctx) => res(ctx.status(500))),
		);
		const { result } = renderUseModelCostDrawer();

		act(() => {
			result.current.openForAdd();
		});

		const draft = { ...EMPTY_DRAFT, modelName: 'gpt-4o' };
		await act(async () => {
			await result.current.save(draft);
		});

		await waitFor(() => expect(result.current.saveError).not.toBeNull());
		expect(result.current.isOpen).toBe(true);
		expect(toastSuccess).not.toHaveBeenCalled();
	});
});
