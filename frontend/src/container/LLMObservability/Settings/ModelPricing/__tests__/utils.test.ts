import {
	LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO,
	LlmpricingruletypesLLMPricingRuleUnitDTO as UnitDTO,
} from 'api/generated/services/sigNoz.schemas';

import { EMPTY_DRAFT } from '../constants';
import type { DrawerDraft } from '../types';
import {
	buildPricingPayload,
	buildRulePayload,
	draftFromRule,
	formatPricePerMillion,
	getCanonicalId,
	getExtraBuckets,
	getRelativeLastSeen,
	getSourceLabel,
	parsePricingAmount,
	validateModelName,
	validatePricing,
	validateProvider,
} from '../utils';
import { makePricingRule } from './fixtures';

describe('parsePricingAmount', () => {
	it('returns null for empty / whitespace-only input', () => {
		expect(parsePricingAmount('')).toBeNull();
		expect(parsePricingAmount('   ')).toBeNull();
	});

	it('parses numeric strings', () => {
		expect(parsePricingAmount('3.5')).toBe(3.5);
		expect(parsePricingAmount('0')).toBe(0);
		expect(parsePricingAmount('-2')).toBe(-2);
	});

	it('returns 0 for non-numeric input', () => {
		expect(parsePricingAmount('abc')).toBe(0);
	});
});

describe('formatPricePerMillion', () => {
	it('renders an em dash for missing values', () => {
		expect(formatPricePerMillion(undefined)).toBe('—');
		expect(formatPricePerMillion(null as unknown as undefined)).toBe('—');
	});

	it('formats numbers to 2dp with a dollar sign', () => {
		expect(formatPricePerMillion(3)).toBe('$3.00');
		expect(formatPricePerMillion(0)).toBe('$0.00');
		expect(formatPricePerMillion(1.2345)).toBe('$1.23');
	});
});

describe('getExtraBuckets', () => {
	it('returns no buckets when there is no cache pricing', () => {
		expect(
			getExtraBuckets(makePricingRule({ pricing: { input: 1, output: 2 } })),
		).toStrictEqual([]);
	});

	it('includes only buckets with a positive value', () => {
		const rule = makePricingRule({
			pricing: {
				input: 1,
				output: 2,
				cache: { mode: CacheModeDTO.subtract, read: 5, write: 0 },
			},
		});
		expect(getExtraBuckets(rule)).toStrictEqual([
			{ key: 'cache_read', pricePerMillion: 5 },
		]);
	});

	it('includes both read and write when both are positive', () => {
		const rule = makePricingRule({
			pricing: {
				input: 1,
				output: 2,
				cache: { mode: CacheModeDTO.additive, read: 5, write: 7 },
			},
		});
		expect(getExtraBuckets(rule)).toStrictEqual([
			{ key: 'cache_read', pricePerMillion: 5 },
			{ key: 'cache_write', pricePerMillion: 7 },
		]);
	});
});

describe('getSourceLabel', () => {
	it('maps the override flag to a label', () => {
		expect(getSourceLabel(makePricingRule({ isOverride: true }))).toBe(
			'User override',
		);
		expect(getSourceLabel(makePricingRule({ isOverride: false }))).toBe('Auto');
	});
});

describe('getCanonicalId', () => {
	it('lowercases and trims provider:model', () => {
		expect(
			getCanonicalId(
				makePricingRule({ provider: ' OpenAI ', modelName: ' GPT-4o ' }),
			),
		).toBe('openai:gpt-4o');
	});

	it('falls back to "unknown" for missing segments', () => {
		expect(
			getCanonicalId(
				makePricingRule({
					provider: '' as unknown as string,
					modelName: '' as unknown as string,
				}),
			),
		).toBe('unknown:unknown');
	});
});

describe('getRelativeLastSeen', () => {
	it('returns an em dash when no timestamps are present', () => {
		const rule = makePricingRule({
			updatedAt: undefined,
			syncedAt: null,
			createdAt: undefined,
		});
		expect(getRelativeLastSeen(rule)).toBe('—');
	});

	it('returns a relative string for a valid timestamp', () => {
		const rule = makePricingRule({ updatedAt: '2023-10-10T00:00:00.000Z' });
		expect(getRelativeLastSeen(rule)).not.toBe('—');
		expect(typeof getRelativeLastSeen(rule)).toBe('string');
	});
});

describe('draftFromRule', () => {
	it('maps a rule to a drawer draft with cache defaults', () => {
		const rule = makePricingRule({
			id: 'r1',
			sourceId: 's1',
			modelName: 'gpt-4o',
			provider: 'OpenAI',
			modelPattern: ['gpt-4o', 'gpt-4'],
			isOverride: true,
			pricing: {
				input: 3,
				output: 9,
				cache: { mode: CacheModeDTO.subtract, read: 1, write: 2 },
			},
		});
		expect(draftFromRule(rule)).toStrictEqual({
			id: 'r1',
			sourceId: 's1',
			modelName: 'gpt-4o',
			provider: 'OpenAI',
			patterns: ['gpt-4o', 'gpt-4'],
			isOverride: true,
			pricing: {
				input: 3,
				output: 9,
				cacheMode: CacheModeDTO.subtract,
				cacheRead: 1,
				cacheWrite: 2,
			},
		});
	});

	it('defaults cache mode/values when cache is absent', () => {
		const draft = draftFromRule(
			makePricingRule({ modelPattern: null, pricing: { input: 1, output: 2 } }),
		);
		expect(draft.patterns).toStrictEqual([]);
		expect(draft.pricing.cacheMode).toBe(CacheModeDTO.unknown);
		expect(draft.pricing.cacheRead).toBeNull();
		expect(draft.pricing.cacheWrite).toBeNull();
	});
});

describe('buildPricingPayload', () => {
	it('omits cache when neither bucket has a value', () => {
		const draft: DrawerDraft = {
			...EMPTY_DRAFT,
			pricing: { ...EMPTY_DRAFT.pricing, input: 3, output: 9 },
		};
		expect(buildPricingPayload(draft)).toStrictEqual({ input: 3, output: 9 });
	});

	it('includes only the cache buckets that have a value', () => {
		const draft: DrawerDraft = {
			...EMPTY_DRAFT,
			pricing: {
				input: 3,
				output: 9,
				cacheMode: CacheModeDTO.additive,
				cacheRead: 1,
				cacheWrite: null,
			},
		};
		expect(buildPricingPayload(draft)).toStrictEqual({
			input: 3,
			output: 9,
			cache: { mode: CacheModeDTO.additive, read: 1 },
		});
	});
});

describe('buildRulePayload', () => {
	it('trims names, sets defaults and patterns', () => {
		const draft: DrawerDraft = {
			...EMPTY_DRAFT,
			id: 'r1',
			sourceId: 's1',
			modelName: '  gpt-4o  ',
			provider: '  OpenAI  ',
			patterns: ['gpt-4o'],
			isOverride: true,
			pricing: { ...EMPTY_DRAFT.pricing, input: 3, output: 9 },
		};
		expect(buildRulePayload(draft)).toStrictEqual({
			id: 'r1',
			sourceId: 's1',
			modelName: 'gpt-4o',
			provider: 'OpenAI',
			modelPattern: ['gpt-4o'],
			isOverride: true,
			enabled: true,
			unit: UnitDTO.per_million_tokens,
			pricing: { input: 3, output: 9 },
		});
	});

	it('drops empty id/sourceId to undefined', () => {
		const payload = buildRulePayload({
			...EMPTY_DRAFT,
			modelName: 'm',
			provider: 'p',
			pricing: { ...EMPTY_DRAFT.pricing, input: 1, output: 1 },
		});
		expect(payload.id).toBeUndefined();
		expect(payload.sourceId).toBeUndefined();
	});
});

describe('validateModelName', () => {
	it('requires a name only in add mode', () => {
		expect(validateModelName('', 'add')).toBe('Billing model ID is required.');
		expect(validateModelName('   ', 'add')).toBe('Billing model ID is required.');
		expect(validateModelName('gpt-4o', 'add')).toBe(true);
		expect(validateModelName('', 'edit')).toBe(true);
	});
});

describe('validateProvider', () => {
	it('requires a non-empty provider', () => {
		expect(validateProvider('')).toBe('Provider is required.');
		expect(validateProvider('   ')).toBe('Provider is required.');
		expect(validateProvider('OpenAI')).toBe(true);
	});
});

describe('validatePricing', () => {
	const base = EMPTY_DRAFT.pricing;

	it('skips validation when not an override', () => {
		expect(validatePricing({ ...base, input: null, output: null }, false)).toBe(
			true,
		);
	});

	it('requires positive input and output when override', () => {
		expect(validatePricing({ ...base, input: 0, output: 9 }, true)).toBe(
			'Input cost must be greater than 0.',
		);
		expect(validatePricing({ ...base, input: 3, output: 0 }, true)).toBe(
			'Output cost must be greater than 0.',
		);
	});

	it('rejects negative cache values', () => {
		expect(
			validatePricing({ ...base, input: 3, output: 9, cacheRead: -1 }, true),
		).toBe('Cache costs must be non-negative.');
	});

	it('passes for valid override pricing', () => {
		expect(
			validatePricing(
				{ ...base, input: 3, output: 9, cacheRead: 1, cacheWrite: 2 },
				true,
			),
		).toBe(true);
	});
});
