import {
	DraftGroup,
	FieldContext,
	Mapper,
	MapperGroup,
	MapperOperation,
} from '../types';
import {
	buildDraftGroup,
	buildDraftMapper,
	buildPostableGroup,
	buildPostableMapper,
	buildUpdatableMapper,
	cleanKeys,
	conditionFiltersFromAttributes,
	EMPTY_GROUP_DRAFT,
	EMPTY_MAPPER_DRAFT,
	formatTimestamp,
	getMapperSourceKeys,
	groupDraftFromNode,
	isGroupDraftValid,
	isMapperDraftValid,
	mapperDraftFromNode,
	nodeFromGroupDraft,
	nodeFromMapperDraft,
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
	condition: { attributes: ['gen_ai.', 'llm.'], resource: [] },
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

	describe('conditionFiltersFromAttributes', () => {
		it('maps each attribute key to an attribute-context clause', () => {
			expect(conditionFiltersFromAttributes(['gen_ai.', 'llm.'])).toStrictEqual([
				{ context: 'attribute', key: 'gen_ai.' },
				{ context: 'attribute', key: 'llm.' },
			]);
		});
	});

	describe('formatTimestamp', () => {
		it('renders a dash for missing timestamps', () => {
			expect(formatTimestamp(undefined)).toBe('—');
		});
	});

	describe('draft-tree builders', () => {
		it('builds a draft mapper node carrying the server id', () => {
			expect(buildDraftMapper(mapper)).toStrictEqual({
				localId: 'm1',
				serverId: 'm1',
				name: 'gen_ai.request.model',
				sources: ['high', 'mid', 'low'],
				enabled: true,
			});
		});

		it('builds a draft group node with nested mappers', () => {
			const node = buildDraftGroup(group, [mapper]);
			expect(node.localId).toBe('g1');
			expect(node.serverId).toBe('g1');
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
			enabled: true,
			mappers: [],
		};

		it('builds a form draft from a group node', () => {
			expect(groupDraftFromNode(node)).toStrictEqual({
				id: 'g1',
				name: 'OpenAI',
				attributes: ['gen_ai.'],
				enabled: true,
			});
		});

		it('updates an existing node, preserving its ids and mappers', () => {
			const existing = { ...node, mappers: [buildDraftMapper(mapper)] };
			const updated = nodeFromGroupDraft(
				{
					id: 'g1',
					name: '  Renamed  ',
					attributes: ['a', '', 'a'],
					enabled: false,
				},
				existing,
			);
			expect(updated.localId).toBe('g1');
			expect(updated.serverId).toBe('g1');
			expect(updated.name).toBe('Renamed');
			expect(updated.attributes).toStrictEqual(['a']);
			expect(updated.enabled).toBe(false);
			expect(updated.mappers).toHaveLength(1);
		});

		it('creates a new node with a temp localId and null serverId', () => {
			const created = nodeFromGroupDraft({
				id: null,
				name: 'New',
				attributes: [],
				enabled: true,
			});
			expect(created.serverId).toBeNull();
			expect(created.localId).toMatch(/^local-group-/);
			expect(created.mappers).toStrictEqual([]);
		});

		it('builds a mapper form draft and round-trips through a node', () => {
			const draftMapper = mapperDraftFromNode(buildDraftMapper(mapper));
			expect(draftMapper.id).toBe('m1');
			const created = nodeFromMapperDraft({
				id: null,
				name: 'target',
				sources: ['a', '', 'a', 'b'],
				enabled: true,
			});
			expect(created.serverId).toBeNull();
			expect(created.localId).toMatch(/^local-mapper-/);
			expect(created.sources).toStrictEqual(['a', 'b']);
		});
	});

	describe('validation', () => {
		it('validates a mapper draft (name + at least one source)', () => {
			expect(isMapperDraftValid(EMPTY_MAPPER_DRAFT)).toBe(false);
			expect(
				isMapperDraftValid({ id: null, name: 'x', sources: [' '], enabled: true }),
			).toBe(false);
			expect(
				isMapperDraftValid({ id: null, name: 'x', sources: ['a'], enabled: true }),
			).toBe(true);
		});

		it('validates a group draft (name only)', () => {
			expect(isGroupDraftValid(EMPTY_GROUP_DRAFT)).toBe(false);
			expect(
				isGroupDraftValid({ id: null, name: 'g', attributes: [], enabled: true }),
			).toBe(true);
		});
	});

	describe('API payload builders', () => {
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

		it('omits name on the mapper update payload (immutable target)', () => {
			const payload = buildUpdatableMapper({
				id: 'm1',
				name: 'target',
				sources: ['a'],
				enabled: false,
			});
			expect(payload).not.toHaveProperty('name');
			expect(payload.enabled).toBe(false);
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
