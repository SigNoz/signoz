import {
	SpantypesFieldContextDTO as FieldContext,
	SpantypesSpanMapperDTO as Mapper,
	SpantypesSpanMapperGroupDTO as MapperGroup,
	SpantypesSpanMapperOperationDTO as MapperOperation,
} from 'api/generated/services/sigNoz.schemas';

// Endpoint globs used by MSW handlers. The generated client hits relative
// `/api/v1/span_mapper_groups[...]`, so the `*` prefix matches regardless of
// base URL.
export const GROUPS_ENDPOINT = '*/api/v1/span_mapper_groups';
export function mappersEndpoint(groupId: string): string {
	return `*/api/v1/span_mapper_groups/${groupId}/span_mappers`;
}

export function makeGroup(overrides: Partial<MapperGroup> = {}): MapperGroup {
	return {
		id: 'group-1',
		orgId: 'org-1',
		name: 'demo',
		enabled: true,
		condition: {
			attributes: ['ai.embeddings'],
			resource: ['cloud.account.id'],
		},
		...overrides,
	};
}

export function makeMapper(overrides: Partial<Mapper> = {}): Mapper {
	return {
		id: 'mapper-1',
		groupId: 'group-1',
		name: 'gen_ai.request.model',
		enabled: true,
		fieldContext: FieldContext.attribute,
		config: {
			sources: [
				{
					key: 'genai.model',
					context: FieldContext.attribute,
					operation: MapperOperation.copy,
					priority: 2,
				},
				{
					key: 'llm.model',
					context: FieldContext.attribute,
					operation: MapperOperation.move,
					priority: 1,
				},
			],
		},
		...overrides,
	};
}

// Both list endpoints share the same `{ status, data: { items } }` envelope —
// the generated schema mis-types the mappers response with the groups DTO
// (see GroupMappers), but the runtime envelope shape is identical.
export function makeGroupsResponse(groups: MapperGroup[]): {
	status: string;
	data: { items: MapperGroup[] };
} {
	return { status: 'ok', data: { items: groups } };
}

export function makeMappersResponse(mappers: Mapper[]): {
	status: string;
	data: { items: Mapper[] };
} {
	return { status: 'ok', data: { items: mappers } };
}

export const mockGroups: MapperGroup[] = [
	makeGroup({
		id: 'group-1',
		name: 'demo',
		condition: {
			attributes: ['ai.embeddings'],
			resource: ['cloud.account.id'],
		},
	}),
	makeGroup({
		id: 'group-2',
		name: 'Tool',
		enabled: false,
		condition: { attributes: null, resource: null },
	}),
];

export const mockMappers: Mapper[] = [
	makeMapper({ id: 'mapper-1', groupId: 'group-1' }),
];
