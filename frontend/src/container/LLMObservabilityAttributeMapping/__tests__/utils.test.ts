import { FieldContext, Mapper, MapperGroup, MapperOperation } from '../types';
import {
	buildPostableGroup,
	buildPostableMapper,
	buildUpdatableMapper,
	cleanKeys,
	draftFromGroup,
	draftFromMapper,
	EMPTY_GROUP_DRAFT,
	EMPTY_MAPPER_DRAFT,
	formatTimestamp,
	getConditionFilters,
	getMapperSourceKeys,
	isGroupDraftValid,
	isMapperDraftValid,
} from '../utils';

const mapper: Mapper = {
	id: 'm1',
	group_id: 'g1',
	name: 'gen_ai.request.model',
	enabled: true,
	fieldContext: FieldContext.attribute,
	config: {
		sources: [
			{
				key: 'low',
				context: FieldContext.attribute,
				operation: MapperOperation.copy,
				priority: 1,
			},
			{
				key: 'high',
				context: FieldContext.attribute,
				operation: MapperOperation.copy,
				priority: 3,
			},
			{
				key: 'mid',
				context: FieldContext.attribute,
				operation: MapperOperation.copy,
				priority: 2,
			},
		],
	},
};

const group: MapperGroup = {
	id: 'g1',
	orgId: 'org1',
	name: 'OpenAI',
	enabled: true,
	condition: { attributes: ['gen_ai.', 'llm.'], resource: ['service.name'] },
};

describe('attribute-mapping utils', () => {
	describe('cleanKeys', () => {
		it('trims, drops empties, and de-duplicates preserving order', () => {
			expect(cleanKeys([' a ', '', 'b', 'a', '  '])).toStrictEqual(['a', 'b']);
		});
	});

	describe('getMapperSourceKeys', () => {
		it('returns keys sorted by priority descending', () => {
			expect(getMapperSourceKeys(mapper)).toStrictEqual(['high', 'mid', 'low']);
		});

		it('returns empty array when there are no sources', () => {
			expect(
				getMapperSourceKeys({ ...mapper, config: { sources: null } }),
			).toStrictEqual([]);
		});
	});

	describe('getConditionFilters', () => {
		it('flattens attribute and resource keys into typed clauses', () => {
			expect(getConditionFilters(group)).toStrictEqual([
				{ context: 'attribute', key: 'gen_ai.' },
				{ context: 'attribute', key: 'llm.' },
				{ context: 'resource', key: 'service.name' },
			]);
		});

		it('returns empty array when condition is null', () => {
			expect(getConditionFilters({ ...group, condition: null })).toStrictEqual([]);
		});
	});

	describe('formatTimestamp', () => {
		it('renders a dash for missing timestamps', () => {
			expect(formatTimestamp(undefined)).toBe('—');
		});
	});

	describe('mapper drafts', () => {
		it('builds a draft from a mapper with priority-ordered sources', () => {
			expect(draftFromMapper(mapper)).toStrictEqual({
				id: 'm1',
				name: 'gen_ai.request.model',
				sources: ['high', 'mid', 'low'],
				enabled: true,
			});
		});

		it('validates name and at least one source', () => {
			expect(isMapperDraftValid(EMPTY_MAPPER_DRAFT)).toBe(false);
			expect(
				isMapperDraftValid({ id: null, name: 'x', sources: [' '], enabled: true }),
			).toBe(false);
			expect(
				isMapperDraftValid({ id: null, name: 'x', sources: ['a'], enabled: true }),
			).toBe(true);
		});

		it('derives descending priorities from source order', () => {
			const payload = buildPostableMapper({
				id: null,
				name: ' target ',
				sources: ['a', 'b', 'c'],
				enabled: true,
			});
			expect(payload.name).toBe('target');
			expect(payload.fieldContext).toBe(FieldContext.attribute);
			expect(payload.config.sources).toStrictEqual([
				{
					key: 'a',
					context: FieldContext.attribute,
					operation: MapperOperation.copy,
					priority: 3,
				},
				{
					key: 'b',
					context: FieldContext.attribute,
					operation: MapperOperation.copy,
					priority: 2,
				},
				{
					key: 'c',
					context: FieldContext.attribute,
					operation: MapperOperation.copy,
					priority: 1,
				},
			]);
		});

		it('omits name on the update payload (immutable target)', () => {
			const payload = buildUpdatableMapper({
				id: 'm1',
				name: 'target',
				sources: ['a'],
				enabled: false,
			});
			expect(payload).not.toHaveProperty('name');
			expect(payload.enabled).toBe(false);
		});
	});

	describe('group drafts', () => {
		it('builds a draft from a group', () => {
			expect(draftFromGroup(group)).toStrictEqual({
				id: 'g1',
				name: 'OpenAI',
				attributes: ['gen_ai.', 'llm.'],
				enabled: true,
			});
		});

		it('validates name only (condition may be empty)', () => {
			expect(isGroupDraftValid(EMPTY_GROUP_DRAFT)).toBe(false);
			expect(
				isGroupDraftValid({ id: null, name: 'g', attributes: [], enabled: true }),
			).toBe(true);
		});

		it('builds a postable group with empty resource keys', () => {
			const payload = buildPostableGroup({
				id: null,
				name: 'g',
				attributes: ['gen_ai.', '', 'gen_ai.'],
				enabled: true,
			});
			expect(payload.condition).toStrictEqual({
				attributes: ['gen_ai.'],
				resource: [],
			});
		});
	});
});
