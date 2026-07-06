import { QueryClient, QueryClientProvider } from 'react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { rest, server } from 'mocks-server/server';
import {
	LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO,
	LlmpricingruletypesLLMPricingRuleUnitDTO as UnitDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { LlmpricingruletypesUpdatableLLMPricingRulesDTO } from 'api/generated/services/sigNoz.schemas';

import type { UnpricedModel } from '../../../types';
import {
	useUnpricedModelMapping,
	type UnpricedModelMapping,
} from '../useUnpricedModelMapping';
import {
	LLM_PRICING_ENDPOINT,
	makePricingRule,
} from '../../../__tests__/fixtures';

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

function model(modelName: string): UnpricedModel {
	return { modelName, provider: 'openai', spanCount: 100 };
}

describe('useUnpricedModelMapping', () => {
	afterEach(() => {
		server.resetHandlers();
		toastSuccess.mockClear();
		toastError.mockClear();
	});

	it('mapModels does nothing for an empty list', async () => {
		const { result } = renderHook(() => useUnpricedModelMapping(), {
			wrapper: createWrapper(),
		});

		let didSave = true;
		await act(async () => {
			didSave = await result.current.mapModels([]);
		});

		expect(didSave).toBe(false);
		expect(toastSuccess).not.toHaveBeenCalled();
	});

	it('groups models mapped onto the same rule into one payload (no clobber)', async () => {
		const sent: LlmpricingruletypesUpdatableLLMPricingRulesDTO[] = [];
		server.use(
			rest.put(LLM_PRICING_ENDPOINT, async (req, res, ctx) => {
				sent.push(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);

		// Both unpriced models target the same rule (existing pattern: gpt-4o).
		const rule = makePricingRule({ id: 'rule-openai', modelPattern: ['gpt-4o'] });
		const mappings: UnpricedModelMapping[] = [
			{ model: model('gpt-4o-mini'), rule },
			{ model: model('gpt-4o-nano'), rule },
		];

		const { result } = renderHook(() => useUnpricedModelMapping(), {
			wrapper: createWrapper(),
		});

		let didSave = false;
		await act(async () => {
			didSave = await result.current.mapModels(mappings);
		});

		expect(didSave).toBe(true);
		await waitFor(() => expect(sent).toHaveLength(1));
		// One rule in the request, with both new names appended to the existing pattern.
		expect(sent[0].rules).toHaveLength(1);
		expect(sent[0].rules?.[0].modelPattern).toStrictEqual([
			'gpt-4o',
			'gpt-4o-mini',
			'gpt-4o-nano',
		]);
		expect(toastSuccess).toHaveBeenCalledWith('Mapped 2 models');
	});

	it('preserves the target rule id, flags, and pricing while appending the pattern', async () => {
		const sent: LlmpricingruletypesUpdatableLLMPricingRulesDTO[] = [];
		server.use(
			rest.put(LLM_PRICING_ENDPOINT, async (req, res, ctx) => {
				sent.push(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);

		// An existing priced rule (with cache buckets) that an unpriced model maps
		// onto. The PUT re-sends the whole rule, so pricing/flags must survive intact.
		const rule = makePricingRule({
			id: 'rule-anthropic',
			modelName: 'claude-3-5-sonnet',
			provider: 'Anthropic',
			isOverride: false,
			modelPattern: ['claude-3-5-sonnet'],
			pricing: {
				input: 2,
				output: 30,
				cache: { mode: CacheModeDTO.additive, read: 3, write: 6 },
			},
		});

		const { result } = renderHook(() => useUnpricedModelMapping(), {
			wrapper: createWrapper(),
		});

		await act(async () => {
			await result.current.mapModels([
				{ model: model('claude-3-7-sonnet-20250219'), rule },
			]);
		});

		await waitFor(() => expect(sent).toHaveLength(1));
		// Only modelPattern grows; every other field is carried over from the rule.
		expect(sent[0].rules?.[0]).toStrictEqual({
			id: 'rule-anthropic',
			sourceId: 'source-1',
			modelName: 'claude-3-5-sonnet',
			provider: 'Anthropic',
			modelPattern: ['claude-3-5-sonnet', 'claude-3-7-sonnet-20250219'],
			isOverride: false,
			enabled: true,
			unit: UnitDTO.per_million_tokens,
			pricing: {
				input: 2,
				output: 30,
				cache: { mode: CacheModeDTO.additive, read: 3, write: 6 },
			},
		});
	});

	it('does not duplicate a model name already present in the rule pattern', async () => {
		const sent: LlmpricingruletypesUpdatableLLMPricingRulesDTO[] = [];
		server.use(
			rest.put(LLM_PRICING_ENDPOINT, async (req, res, ctx) => {
				sent.push(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);

		// The mapped model name already matches an existing pattern on the rule.
		const rule = makePricingRule({
			id: 'rule-openai',
			modelPattern: ['gpt-4o', 'gpt-4o-mini'],
		});

		const { result } = renderHook(() => useUnpricedModelMapping(), {
			wrapper: createWrapper(),
		});

		await act(async () => {
			await result.current.mapModels([{ model: model('gpt-4o-mini'), rule }]);
		});

		await waitFor(() => expect(sent).toHaveLength(1));
		expect(sent[0].rules?.[0].modelPattern).toStrictEqual([
			'gpt-4o',
			'gpt-4o-mini',
		]);
	});

	it('emits one rule payload per distinct target rule', async () => {
		const sent: LlmpricingruletypesUpdatableLLMPricingRulesDTO[] = [];
		server.use(
			rest.put(LLM_PRICING_ENDPOINT, async (req, res, ctx) => {
				sent.push(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);

		const openai = makePricingRule({ id: 'rule-openai', modelPattern: [] });
		const anthropic = makePricingRule({ id: 'rule-anthropic', modelPattern: [] });

		const { result } = renderHook(() => useUnpricedModelMapping(), {
			wrapper: createWrapper(),
		});

		await act(async () => {
			await result.current.mapModels([
				{ model: model('gpt-4o-mini'), rule: openai },
				{ model: model('claude-3-7'), rule: anthropic },
			]);
		});

		await waitFor(() => expect(sent).toHaveLength(1));
		expect(sent[0].rules).toHaveLength(2);
		expect(toastSuccess).toHaveBeenCalledWith('Mapped 2 models');
	});

	it('returns false and toasts an error when the request fails', async () => {
		server.use(
			rest.put(LLM_PRICING_ENDPOINT, (_req, res, ctx) => res(ctx.status(500))),
		);

		const rule = makePricingRule({ id: 'rule-openai' });
		const { result } = renderHook(() => useUnpricedModelMapping(), {
			wrapper: createWrapper(),
		});

		let didSave = true;
		await act(async () => {
			didSave = await result.current.mapModels([
				{ model: model('gpt-4o-mini'), rule },
			]);
		});

		expect(didSave).toBe(false);
		await waitFor(() => expect(toastError).toHaveBeenCalled());
	});
});
