import {
	ListSpanMappers200,
	SpantypesSpanMapperDTO,
	SpantypesSpanMapperGroupDTO,
} from 'api/generated/services/sigNoz.schemas';

import { MappingGroup, Mapping, SourceConfig } from './types';

function getMapperSources(mapper: SpantypesSpanMapperDTO): SourceConfig[] {
	const sources = mapper.config?.sources ?? [];
	return [...sources]
		.sort((a, b) => a.priority - b.priority)
		.map((source) => ({
			key: source.key,
			context: source.context,
			operation: source.operation,
		}));
}

export function buildMapping(mapper: SpantypesSpanMapperDTO): Mapping {
	return {
		id: mapper.id,
		name: mapper.name,
		fieldContext: mapper.fieldContext,
		sources: getMapperSources(mapper),
		enabled: mapper.enabled,
	};
}

export function buildMappingsFromListResponse(
	response: ListSpanMappers200,
): Mapping[] {
	const items = (response.data?.items ??
		[]) as unknown as SpantypesSpanMapperDTO[];
	return items.map(buildMapping);
}

export function buildMappingGroup(
	group: SpantypesSpanMapperGroupDTO,
): MappingGroup {
	return {
		id: group.id,
		name: group.name,
		attributes: group.condition?.attributes ?? [],
		resource: group.condition?.resource ?? [],
		enabled: group.enabled,
	};
}
