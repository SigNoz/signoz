import {
	ConditionFilter,
	DraftGroup,
	DraftMapper,
	Mapper,
	MapperGroup,
	SourceConfig,
} from './types';

// Display clauses for a group's condition keys (span attribute keys first,
// then resource keys).
export function conditionFiltersFromGroup(group: {
	attributes?: string[];
	resource?: string[];
}): ConditionFilter[] {
	// TanStackTable renders skeleton placeholder rows through the cells on first
	// render, so these arrays can be undefined before real data lands — default
	// to empty rather than crashing the cell.
	return [
		...(group.attributes ?? []).map((key) => ({
			context: 'attribute' as const,
			key,
		})),
		...(group.resource ?? []).map((key) => ({
			context: 'resource' as const,
			key,
		})),
	];
}

// Source configs for a mapper, highest priority first (first match wins at
// evaluation time).
export function getMapperSources(mapper: Mapper): SourceConfig[] {
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

export function buildDraftMapper(mapper: Mapper): DraftMapper {
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
	group: MapperGroup,
	mappers: Mapper[],
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
