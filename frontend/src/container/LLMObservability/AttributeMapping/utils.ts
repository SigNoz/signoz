import {
	ListSpanMappers200,
	SpantypesPostableSpanMapperGroupDTO,
	SpantypesSpanMapperDTO,
	SpantypesUpdatableSpanMapperGroupDTO,
} from 'api/generated/services/sigNoz.schemas';
import { v4 as uuid } from 'uuid';

import {
	DraftGroup,
	GroupDraft,
	MapperGroup,
	Mapping,
	SourceConfig,
} from './types';

// Client-side id for not-yet-persisted rows. Prefixed so it never collides
// with a server UUID and is easy to spot in logs.
function genLocalId(prefix: 'group' | 'mapper'): string {
	return `local-${prefix}-${uuid()}`;
}

// Trimmed, de-duplicated, non-empty keys preserving input order.
function cleanKeys(keys: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	keys.forEach((raw) => {
		const key = raw.trim();
		if (key && !seen.has(key)) {
			seen.add(key);
			result.push(key);
		}
	});
	return result;
}

// Source configs for a mapper, highest priority first (first match wins at
// evaluation time).
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

// Server mapper DTO -> read-only row model (see GroupMappers).
export function buildMapping(mapper: SpantypesSpanMapperDTO): Mapping {
	return {
		id: mapper.id,
		name: mapper.name,
		fieldContext: mapper.fieldContext,
		sources: getMapperSources(mapper),
		enabled: mapper.enabled,
	};
}

// Server list response -> read-only row models (see GroupMappers).
export function buildMappingsFromListResponse(
	response: ListSpanMappers200,
): Mapping[] {
	const items = (response.data?.items ??
		[]) as unknown as SpantypesSpanMapperDTO[];
	return items.map(buildMapping);
}

// ---- group form helpers ----

export const EMPTY_GROUP_DRAFT: GroupDraft = {
	id: null,
	name: '',
	attributes: [''],
	resource: [],
	enabled: true,
};

export function isGroupDraftValid(draft: GroupDraft): boolean {
	return draft.name.trim().length > 0;
}

export function buildPostableGroup(
	draft: GroupDraft,
): SpantypesPostableSpanMapperGroupDTO {
	return {
		name: draft.name.trim(),
		enabled: draft.enabled,
		condition: {
			attributes: cleanKeys(draft.attributes),
			resource: cleanKeys(draft.resource),
		},
	};
}

export function buildUpdatableGroup(
	draft: GroupDraft,
): SpantypesUpdatableSpanMapperGroupDTO {
	return buildPostableGroup(draft);
}

export function buildDraftGroup(group: MapperGroup): DraftGroup {
	return {
		localId: group.id,
		serverId: group.id,
		name: group.name,
		attributes: group.condition?.attributes ?? [],
		resource: group.condition?.resource ?? [],
		enabled: group.enabled,
	};
}

export function groupDraftFromNode(group: DraftGroup): GroupDraft {
	return {
		id: group.localId,
		name: group.name,
		attributes: group.attributes.length > 0 ? group.attributes : [''],
		resource: group.resource,
		enabled: group.enabled,
	};
}

export function nodeFromGroupDraft(
	draft: GroupDraft,
	existing?: DraftGroup,
): DraftGroup {
	return {
		localId: existing?.localId ?? genLocalId('group'),
		serverId: existing?.serverId ?? null,
		name: draft.name.trim(),
		attributes: cleanKeys(draft.attributes),
		resource: cleanKeys(draft.resource),
		enabled: draft.enabled,
	};
}
