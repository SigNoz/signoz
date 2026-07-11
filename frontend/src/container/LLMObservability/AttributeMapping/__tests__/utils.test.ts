import {
	SpantypesFieldContextDTO as FieldContext,
	SpantypesSpanMapperOperationDTO as MapperOperation,
} from 'api/generated/services/sigNoz.schemas';

import {
	buildDraftGroup,
	buildDraftMapper,
	conditionFiltersFromGroup,
	getMapperSources,
} from '../utils';
import { makeGroup, makeMapper } from './fixtures';

describe('conditionFiltersFromGroup', () => {
	it('lists attribute keys before resource keys', () => {
		const filters = conditionFiltersFromGroup({
			attributes: ['ai.embeddings'],
			resource: ['cloud.account.id'],
		});

		expect(filters).toStrictEqual([
			{ context: 'attribute', key: 'ai.embeddings' },
			{ context: 'resource', key: 'cloud.account.id' },
		]);
	});

	it('defaults missing attributes/resource to no filters', () => {
		expect(conditionFiltersFromGroup({})).toStrictEqual([]);
	});
});

describe('getMapperSources', () => {
	it('orders sources by priority, highest first', () => {
		const mapper = makeMapper({
			config: {
				sources: [
					{
						key: 'llm.model',
						context: FieldContext.attribute,
						operation: MapperOperation.move,
						priority: 1,
					},
					{
						key: 'genai.model',
						context: FieldContext.attribute,
						operation: MapperOperation.copy,
						priority: 2,
					},
				],
			},
		});

		expect(getMapperSources(mapper)).toStrictEqual([
			{
				key: 'genai.model',
				context: FieldContext.attribute,
				operation: MapperOperation.copy,
			},
			{
				key: 'llm.model',
				context: FieldContext.attribute,
				operation: MapperOperation.move,
			},
		]);
	});

	it('defaults a null sources config to an empty list', () => {
		const mapper = makeMapper({ config: { sources: null } });

		expect(getMapperSources(mapper)).toStrictEqual([]);
	});
});

describe('buildDraftMapper', () => {
	it('maps the server mapper into a draft node keyed by the server id', () => {
		const mapper = makeMapper({ id: 'mapper-9', enabled: false });

		const draft = buildDraftMapper(mapper);

		expect(draft.localId).toBe('mapper-9');
		expect(draft.serverId).toBe('mapper-9');
		expect(draft.name).toBe(mapper.name);
		expect(draft.enabled).toBe(false);
		expect(draft.sources).toStrictEqual(getMapperSources(mapper));
	});
});

describe('buildDraftGroup', () => {
	it('maps the server group and its mappers into a draft tree', () => {
		const group = makeGroup({
			id: 'group-9',
			condition: { attributes: ['a'], resource: ['b'] },
		});
		const mapper = makeMapper({ id: 'mapper-1' });

		const draft = buildDraftGroup(group, [mapper]);

		expect(draft.localId).toBe('group-9');
		expect(draft.serverId).toBe('group-9');
		expect(draft.attributes).toStrictEqual(['a']);
		expect(draft.resource).toStrictEqual(['b']);
		expect(draft.mappers).toHaveLength(1);
		expect(draft.mappers[0].localId).toBe('mapper-1');
	});

	it('defaults a null condition to empty attributes/resource', () => {
		const group = makeGroup({ condition: null });

		const draft = buildDraftGroup(group, []);

		expect(draft.attributes).toStrictEqual([]);
		expect(draft.resource).toStrictEqual([]);
	});
});
