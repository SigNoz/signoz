import {
	SpantypesSpanMapperDTO,
	SpantypesSpanMapperGroupDTO,
} from 'api/generated/services/sigNoz.schemas';

import { DraftGroup, DraftMapper, SourceConfig } from './types';

// Source configs for a mapper, highest priority first (first match wins at
// evaluation time).
export function getMapperSources(
	mapper: SpantypesSpanMapperDTO,
): SourceConfig[] {
	const sources = mapper.config?.sources ?? [];
	return [...sources]
		.sort((a, b) => b.priority - a.priority)
		.map((source) => ({
			key: source.key,
			context: source.context,
			operation: source.operation,
		}));
}

// ---- working-copy (draft tree) helpers ----

export function buildDraftMapper(mapper: SpantypesSpanMapperDTO): DraftMapper {
	return {
		localId: mapper.id,
		serverId: mapper.id,
		name: mapper.name,
		fieldContext: mapper.fieldContext,
		sources: getMapperSources(mapper),
		enabled: mapper.enabled,
	};
}

export function buildDraftGroup(
	group: SpantypesSpanMapperGroupDTO,
	mappers: SpantypesSpanMapperDTO[],
): DraftGroup {
	return {
		localId: group.id,
		serverId: group.id,
		name: group.name,
		attributes: group.condition?.attributes ?? [],
		resource: group.condition?.resource ?? [],
		enabled: group.enabled,
		mappers: mappers.map(buildDraftMapper),
	};
}
