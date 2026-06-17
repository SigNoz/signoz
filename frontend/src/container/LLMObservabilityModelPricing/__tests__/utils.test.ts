import {
	LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO,
	LlmpricingruletypesLLMPricingRuleUnitDTO as UnitDTO,
} from 'api/generated/services/sigNoz.schemas';

import type { PricingRule } from '../types';
import {
	formatPricePerMillion,
	getCanonicalId,
	getExtraBuckets,
	getRelativeLastSeen,
	getSourceLabel,
} from '../utils';

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

describe('utils', () => {
	describe('formatPricePerMillion', () => {
		it('formats numbers with 2 decimals and dollar prefix', () => {
			expect(formatPricePerMillion(15)).toBe('$15.00');
			expect(formatPricePerMillion(0.15)).toBe('$0.15');
		});

		it('returns em-dash for nullish or NaN', () => {
			expect(formatPricePerMillion(undefined)).toBe('—');
			expect(formatPricePerMillion(Number.NaN)).toBe('—');
		});
	});

	describe('getExtraBuckets', () => {
		it('returns an empty array when there is no cache pricing', () => {
			expect(getExtraBuckets(makeRule())).toStrictEqual([]);
		});

		it('returns only buckets with values > 0', () => {
			const rule = makeRule({
				pricing: {
					input: 3,
					output: 15,
					cache: {
						mode: CacheModeDTO.additive,
						read: 0.3,
						write: 0,
					},
				},
			});
			const buckets = getExtraBuckets(rule);
			expect(buckets).toStrictEqual([{ key: 'cache_read', pricePerMillion: 0.3 }]);
		});
	});

	describe('getSourceLabel', () => {
		it('returns "Auto" for non-override and "User override" otherwise', () => {
			expect(getSourceLabel(makeRule({ isOverride: false }))).toBe('Auto');
			expect(getSourceLabel(makeRule({ isOverride: true }))).toBe('User override');
		});
	});

	describe('getCanonicalId', () => {
		it('lowercases the provider and joins with the model name', () => {
			expect(getCanonicalId(makeRule({ provider: 'OpenAI' }))).toBe(
				'openai:gpt-4o',
			);
		});
	});

	describe('getRelativeLastSeen', () => {
		it('returns em-dash when no timestamp is present', () => {
			expect(getRelativeLastSeen(makeRule())).toBe('—');
		});

		it('formats minutes-old timestamps via dayjs fromNow', () => {
			const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();
			expect(getRelativeLastSeen(makeRule({ updatedAt: recent }))).toMatch(
				/minutes? ago/,
			);
		});
	});
});
