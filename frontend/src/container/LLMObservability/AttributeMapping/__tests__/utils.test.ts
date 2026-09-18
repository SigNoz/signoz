import {
	SpantypesFieldContextDTO as FieldContext,
	SpantypesSpanMapperOperationDTO as MapperOperation,
	SpantypesSpanMapperOriginDTO as MapperOrigin,
} from 'api/generated/services/sigNoz.schemas';

import {
	buildDraftGroup,
	buildDraftMapper,
	buildPostableGroup,
	buildUpdatableMapper,
	groupDraftFromNode,
	mapperDraftFromNode,
	nodeFromGroupDraft,
	nodeFromMapperDraft,
} from '../utils';
import { makeGroup, makeMapper } from './fixtures';

const shippedGroup = makeGroup({
	id: 'group-1',
	origin: MapperOrigin.system,
	condition: {
		attributes: [
			{ value: 'gen_ai.', enabled: false, origin: MapperOrigin.system },
			{ value: 'my.attr', enabled: true, origin: MapperOrigin.user },
		],
		resource: [],
	},
});

const shippedMapper = makeMapper({
	id: 'mapper-1',
	origin: MapperOrigin.system,
	config: {
		sources: [
			{
				key: 'llm.model',
				context: FieldContext.attribute,
				operation: MapperOperation.copy,
				priority: 2,
				enabled: false,
				origin: MapperOrigin.system,
			},
			{
				key: 'custom.model',
				context: FieldContext.attribute,
				operation: MapperOperation.move,
				priority: 1,
				enabled: true,
				origin: MapperOrigin.user,
			},
		],
	},
});

describe('attribute mapping draft round-trip', () => {
	it('keeps the origin the API reported on each condition key', () => {
		const draft = buildDraftGroup(shippedGroup, []);

		expect(draft.attributes).toStrictEqual([
			{ value: 'gen_ai.', enabled: false, origin: MapperOrigin.system },
			{ value: 'my.attr', enabled: true, origin: MapperOrigin.user },
		]);
	});

	it('keeps the origin the API reported on each source', () => {
		const draft = buildDraftMapper(shippedMapper);

		// Sorted highest priority first, and priority itself is dropped — list
		// order carries it.
		expect(draft.sources).toStrictEqual([
			{
				key: 'llm.model',
				context: FieldContext.attribute,
				operation: MapperOperation.copy,
				enabled: false,
				origin: MapperOrigin.system,
			},
			{
				key: 'custom.model',
				context: FieldContext.attribute,
				operation: MapperOperation.move,
				enabled: true,
				origin: MapperOrigin.user,
			},
		]);
	});

	// `origin` is optional on the wire; drafts always carry a concrete value.
	it('defaults a condition key with no origin to user', () => {
		const draft = buildDraftGroup(
			makeGroup({
				condition: {
					attributes: [{ value: 'gen_ai.', enabled: true }],
					resource: null,
				},
			}),
			[],
		);

		expect(draft.attributes[0].origin).toBe(MapperOrigin.user);
	});

	it('sends condition keys back with their origin and enabled flag intact', () => {
		const node = buildDraftGroup(shippedGroup, []);
		const roundTripped = nodeFromGroupDraft(groupDraftFromNode(node), node);
		const postable = buildPostableGroup(groupDraftFromNode(roundTripped));

		expect(postable.condition?.attributes).toStrictEqual([
			{ value: 'gen_ai.', enabled: false, origin: MapperOrigin.system },
			{ value: 'my.attr', enabled: true, origin: MapperOrigin.user },
		]);
	});

	it('sends sources back with their origin and enabled flag, priority from order', () => {
		const node = buildDraftMapper(shippedMapper);
		const roundTripped = nodeFromMapperDraft(mapperDraftFromNode(node), node);
		const updatable = buildUpdatableMapper(mapperDraftFromNode(roundTripped));

		expect(updatable.config?.sources).toStrictEqual([
			{
				key: 'llm.model',
				context: FieldContext.attribute,
				operation: MapperOperation.copy,
				priority: 2,
				enabled: false,
				origin: MapperOrigin.system,
			},
			{
				key: 'custom.model',
				context: FieldContext.attribute,
				operation: MapperOperation.move,
				priority: 1,
				enabled: true,
				origin: MapperOrigin.user,
			},
		]);
	});
});
