import {
	DraftGroup,
	FieldContext,
	Mapper,
	MapperDraft,
	MapperGroup,
	MapperOperation,
	SourceConfig,
} from '../types';
import {
	buildDraftGroup,
	buildDraftMapper,
	buildPostableGroup,
	buildPostableMapper,
	buildUpdatableMapper,
	cleanKeys,
	conditionFiltersFromGroup,
	EMPTY_GROUP_DRAFT,
	EMPTY_MAPPER_DRAFT,
	formatTimestamp,
	getMapperSources,
	groupDraftFromNode,
	isGroupDraftValid,
	isMapperDraftValid,
	mapperDraftFromNode,
	nodeFromGroupDraft,
	nodeFromMapperDraft,
} from '../utils';

function src(
	key: string,
	operation = MapperOperation.copy,
	context = FieldContext.attribute,
): SourceConfig {
	return { key, context, operation };
}

function mapperDraft(over: Partial<MapperDraft>): MapperDraft {
	return {
		id: null,
		name: 'target',
		fieldContext: FieldContext.attribute,
		sources: [src('a')],
		enabled: true,
		...over,
	};
}

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
				context: FieldContext.resource,
				operation: MapperOperation.move,
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
	condition: { attributes: ['gen_ai.', 'llm.'], resource: [] },
};

describe('attribute-mapping utils', () => {
	describe('cleanKeys', () => {
		it('trims, drops empties, and de-duplicates preserving order', () => {
			expect(cleanKeys([' a ', '', 'b', 'a', '  '])).toStrictEqual(['a', 'b']);
		});
	});

	describe('getMapperSources', () => {
		it('returns sources sorted by priority descending, preserving context/operation', () => {
			expect(getMapperSources(mapper)).toStrictEqual([
				{ key: 'high', context: FieldContext.resource, operation: MapperOperation.move },
				{ key: 'mid', context: FieldContext.attribute, operation: MapperOperation.copy },
				{ key: 'low', context: FieldContext.attribute, operation: MapperOperation.copy },
			]);
		});

		it('returns empty array when there are no sources', () => {
			expect(
				getMapperSources({ ...mapper, config: { sources: null } }),
			).toStrictEqual([]);
		});
	});

	describe('conditionFiltersFromGroup', () => {
		it('lists attribute clauses first, then resource clauses', () => {
			expect(
				conditionFiltersFromGroup({
					attributes: ['gen_ai.', 'llm.'],
					resource: ['service.name'],
				}),
			).toStrictEqual([
				{ context: 'attribute', key: 'gen_ai.' },
				{ context: 'attribute', key: 'llm.' },
				{ context: 'resource', key: 'service.name' },
			]);
		});
	});

	describe('formatTimestamp', () => {
		it('renders a dash for missing timestamps', () => {
			expect(formatTimestamp(undefined)).toBe('—');
		});
	});

	describe('draft-tree builders', () => {
		it('builds a draft mapper node carrying server id, fieldContext and sources', () => {
			expect(buildDraftMapper(mapper)).toStrictEqual({
				localId: 'm1',
				serverId: 'm1',
				name: 'gen_ai.request.model',
				fieldContext: FieldContext.attribute,
				sources: [
					{ key: 'high', context: FieldContext.resource, operation: MapperOperation.move },
					{ key: 'mid', context: FieldContext.attribute, operation: MapperOperation.copy },
					{ key: 'low', context: FieldContext.attribute, operation: MapperOperation.copy },
				],
				enabled: true,
			});
		});

		it('builds a draft group node with nested mappers', () => {
			const node = buildDraftGroup(group, [mapper]);
			expect(node.localId).toBe('g1');
			expect(node.attributes).toStrictEqual(['gen_ai.', 'llm.']);
			expect(node.mappers).toHaveLength(1);
			expect(node.mappers[0].localId).toBe('m1');
		});
	});

	describe('node <-> form conversions', () => {
		const node: DraftGroup = {
			localId: 'g1',
			serverId: 'g1',
			name: 'OpenAI',
			attributes: ['gen_ai.'],
			resource: ['service.name'],
			enabled: true,
			mappers: [],
		};

		it('builds a form draft from a group node', () => {
			expect(groupDraftFromNode(node)).toStrictEqual({
				id: 'g1',
				name: 'OpenAI',
				attributes: ['gen_ai.'],
				resource: ['service.name'],
				enabled: true,
			});
		});

		it('updates an existing group node, preserving its ids and mappers', () => {
			const existing = { ...node, mappers: [buildDraftMapper(mapper)] };
			const updated = nodeFromGroupDraft(
				{
					id: 'g1',
					name: '  Renamed  ',
					attributes: ['a', '', 'a'],
					resource: ['service.name', ''],
					enabled: false,
				},
				existing,
			);
			expect(updated.serverId).toBe('g1');
			expect(updated.name).toBe('Renamed');
			expect(updated.attributes).toStrictEqual(['a']);
			expect(updated.resource).toStrictEqual(['service.name']);
			expect(updated.mappers).toHaveLength(1);
		});

		it('round-trips a mapper node through the form and de-dups sources by key', () => {
			const draft = mapperDraftFromNode(buildDraftMapper(mapper));
			expect(draft.id).toBe('m1');
			expect(draft.fieldContext).toBe(FieldContext.attribute);

			const created = nodeFromMapperDraft(
				mapperDraft({
					id: null,
					sources: [src('a', MapperOperation.move), src(' '), src('a'), src('b')],
				}),
			);
			expect(created.serverId).toBeNull();
			expect(created.localId).toMatch(/^local-mapper-/);
			expect(created.sources).toStrictEqual([
				{ key: 'a', context: FieldContext.attribute, operation: MapperOperation.move },
				{ key: 'b', context: FieldContext.attribute, operation: MapperOperation.copy },
			]);
		});
	});

	describe('validation', () => {
		it('validates a mapper draft (name + at least one keyed source)', () => {
			expect(isMapperDraftValid(EMPTY_MAPPER_DRAFT)).toBe(false);
			expect(isMapperDraftValid(mapperDraft({ name: 'x', sources: [src(' ')] }))).toBe(
				false,
			);
			expect(isMapperDraftValid(mapperDraft({ name: 'x', sources: [src('a')] }))).toBe(
				true,
			);
		});

		it('validates a group draft (name only)', () => {
			expect(isGroupDraftValid(EMPTY_GROUP_DRAFT)).toBe(false);
			expect(
				isGroupDraftValid({
					id: null,
					name: 'g',
					attributes: [],
					resource: [],
					enabled: true,
				}),
			).toBe(true);
		});
	});

	describe('API payload builders', () => {
		it('derives descending priorities and carries per-source context/operation', () => {
			const payload = buildPostableMapper(
				mapperDraft({
					name: ' target ',
					fieldContext: FieldContext.resource,
					sources: [
						src('a', MapperOperation.move),
						src('b', MapperOperation.copy, FieldContext.resource),
					],
				}),
			);
			expect(payload.name).toBe('target');
			expect(payload.fieldContext).toBe(FieldContext.resource);
			expect(payload.config.sources).toStrictEqual([
				{ key: 'a', context: FieldContext.attribute, operation: MapperOperation.move, priority: 2 },
				{ key: 'b', context: FieldContext.resource, operation: MapperOperation.copy, priority: 1 },
			]);
		});

		it('omits name on the mapper update payload (immutable target)', () => {
			const payload = buildUpdatableMapper(
				mapperDraft({ id: 'm1', enabled: false, fieldContext: FieldContext.resource }),
			);
			expect(payload).not.toHaveProperty('name');
			expect(payload.enabled).toBe(false);
			expect(payload.fieldContext).toBe(FieldContext.resource);
		});

		it('cleans both attribute and resource condition keys', () => {
			const payload = buildPostableGroup({
				id: null,
				name: 'g',
				attributes: ['gen_ai.', '', 'gen_ai.'],
				resource: ['service.name', '  ', 'service.name'],
				enabled: true,
			});
			expect(payload.condition).toStrictEqual({
				attributes: ['gen_ai.'],
				resource: ['service.name'],
			});
		});
	});
});
