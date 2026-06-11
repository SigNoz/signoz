import {
	LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO,
	LlmpricingruletypesLLMPricingRuleUnitDTO as UnitDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	buildPricingPayload,
	buildRulePayload,
	computeCostPreview,
	draftFromRule,
	EMPTY_DRAFT,
	matchesAnyPattern,
	validateDraft,
	type DrawerDraft,
} from '../drawerUtils';
import type { PricingRule } from '../utils';

const makeRule = (overrides: Partial<PricingRule> = {}): PricingRule => ({
	id: 'rule-1',
	orgId: 'org-1',
	modelName: 'gpt-4o',
	provider: 'OpenAI',
	modelPattern: ['gpt-4o'],
	isOverride: false,
	enabled: true,
	unit: UnitDTO.per_million_tokens,
	pricing: { input: 15, output: 60 },
	...overrides,
});

describe('drawerUtils', () => {
	describe('draftFromRule', () => {
		it('maps a rule to a draft with cache values when present', () => {
			const rule = makeRule({
				pricing: {
					input: 3,
					output: 15,
					cache: {
						mode: CacheModeDTO.additive,
						read: 0.3,
						write: 3.75,
					},
				},
			});
			const draft = draftFromRule(rule);
			expect(draft.modelName).toBe('gpt-4o');
			expect(draft.pricing.input).toBe(3);
			expect(draft.pricing.cacheRead).toBe(0.3);
			expect(draft.pricing.cacheWrite).toBe(3.75);
			expect(draft.pricing.cacheMode).toBe(CacheModeDTO.additive);
		});

		it('falls back to defaults when cache is missing', () => {
			const draft = draftFromRule(makeRule());
			expect(draft.pricing.cacheRead).toBeNull();
			expect(draft.pricing.cacheWrite).toBeNull();
			expect(draft.pricing.cacheMode).toBe(CacheModeDTO.unknown);
		});
	});

	describe('buildPricingPayload', () => {
		it('omits the cache block when no cache values are set', () => {
			const payload = buildPricingPayload(EMPTY_DRAFT);
			expect(payload.cache).toBeUndefined();
		});

		it('includes only the cache values that are > 0', () => {
			const draft: DrawerDraft = {
				...EMPTY_DRAFT,
				pricing: {
					...EMPTY_DRAFT.pricing,
					cacheRead: 1.5,
					cacheWrite: 0,
					cacheMode: CacheModeDTO.subtract,
				},
			};
			const payload = buildPricingPayload(draft);
			expect(payload.cache?.read).toBe(1.5);
			expect(payload.cache?.write).toBeUndefined();
			expect(payload.cache?.mode).toBe(CacheModeDTO.subtract);
		});
	});

	describe('buildRulePayload', () => {
		it('uses the modelName as a default pattern when no patterns are supplied', () => {
			const draft: DrawerDraft = {
				...EMPTY_DRAFT,
				modelName: 'gpt-4o',
				patterns: [],
				provider: 'OpenAI',
			};
			const payload = buildRulePayload(draft);
			expect(payload.modelPattern).toStrictEqual(['gpt-4o']);
			expect(payload.unit).toBe(UnitDTO.per_million_tokens);
			expect(payload.enabled).toBe(true);
		});

		it('omits id and sourceId for an Add draft', () => {
			const payload = buildRulePayload(EMPTY_DRAFT);
			expect(payload.id).toBeUndefined();
			expect(payload.sourceId).toBeUndefined();
		});
	});

	describe('validateDraft', () => {
		it('requires a model name in Add mode', () => {
			const result = validateDraft(EMPTY_DRAFT, 'add');
			expect(result.ok).toBe(false);
			expect(result.message).toMatch(/billing model id/i);
		});

		it('rejects negative pricing', () => {
			const draft: DrawerDraft = {
				...EMPTY_DRAFT,
				modelName: 'gpt-4o',
				pricing: { ...EMPTY_DRAFT.pricing, input: -1 },
			};
			expect(validateDraft(draft, 'add').ok).toBe(false);
		});

		it('accepts a valid Add draft', () => {
			const draft: DrawerDraft = {
				...EMPTY_DRAFT,
				modelName: 'gpt-4o',
				pricing: { ...EMPTY_DRAFT.pricing, input: 1, output: 2 },
			};
			expect(validateDraft(draft, 'add').ok).toBe(true);
		});
	});

	describe('matchesAnyPattern', () => {
		it('returns the matching prefix pattern, case-insensitive', () => {
			expect(matchesAnyPattern('GPT-4o-2024', ['gpt-4o'])).toBe('gpt-4o');
		});

		it('returns null when nothing matches', () => {
			expect(matchesAnyPattern('claude', ['gpt-4o'])).toBeNull();
		});
	});

	describe('computeCostPreview', () => {
		it('adds cache buckets when they are set', () => {
			const draft: DrawerDraft = {
				...EMPTY_DRAFT,
				pricing: {
					...EMPTY_DRAFT.pricing,
					input: 10,
					output: 30,
					cacheRead: 5,
				},
			};
			const preview = computeCostPreview(draft);
			const labels = preview.breakdown.map((part) => part.label);
			expect(labels).toContain('2000 input');
			expect(labels).toContain('500 output');
			expect(labels).toContain('1000 cache_read');
			expect(preview.total).toBeGreaterThan(0);
		});
	});
});
