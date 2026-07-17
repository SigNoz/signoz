import {
	SpantypesPostableSpanMapperDTO,
	SpantypesPostableSpanMapperGroupDTO,
	SpantypesUpdatableSpanMapperDTO,
	SpantypesUpdatableSpanMapperGroupDTO,
} from 'api/generated/services/sigNoz.schemas';
import { v4 as uuid } from 'uuid';

import {
	DraftGroup,
	DraftMapper,
	FieldContext,
	GroupDraft,
	Mapper,
	MapperDraft,
	MapperGroup,
	MapperOperation,
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
function getMapperSources(mapper: Mapper): SourceConfig[] {
	const sources = mapper.config?.sources ?? [];
	return [...sources]
		.sort((a, b) => b.priority - a.priority)
		.map((source) => ({
			key: source.key,
			context: source.context,
			operation: source.operation,
		}));
}

export function createEmptySource(): SourceConfig {
	return {
		key: '',
		context: FieldContext.attribute,
		operation: MapperOperation.copy,
	};
}

export const EMPTY_MAPPER_DRAFT: MapperDraft = {
	id: null,
	name: '',
	fieldContext: FieldContext.attribute,
	sources: [createEmptySource()],
	enabled: true,
};

function getCleanSources(draft: MapperDraft): SourceConfig[] {
	const seen = new Set<string>();
	const result: SourceConfig[] = [];
	draft.sources.forEach((source) => {
		const key = source.key.trim();
		const dedupeKey = `${source.context}:${key}`;
		if (key && !seen.has(dedupeKey)) {
			seen.add(dedupeKey);
			result.push({ ...source, key });
		}
	});
	return result;
}

export function isMapperDraftValid(draft: MapperDraft): boolean {
	return draft.name.trim().length > 0 && getCleanSources(draft).length > 0;
}

// Priority is derived from list order so the first row wins.
function buildSources(
	draft: MapperDraft,
): SpantypesPostableSpanMapperDTO['config']['sources'] {
	const sources = getCleanSources(draft);
	return sources.map((source, index) => ({
		key: source.key,
		context: source.context,
		operation: source.operation,
		priority: sources.length - index,
	}));
}

export function buildPostableMapper(
	draft: MapperDraft,
): SpantypesPostableSpanMapperDTO {
	return {
		name: draft.name.trim(),
		fieldContext: draft.fieldContext,
		enabled: draft.enabled,
		config: { sources: buildSources(draft) },
	};
}

// The target name is immutable on update (UpdatableSpanMapper has no name).
export function buildUpdatableMapper(
	draft: MapperDraft,
): SpantypesUpdatableSpanMapperDTO {
	return {
		fieldContext: draft.fieldContext,
		enabled: draft.enabled,
		config: { sources: buildSources(draft) },
	};
}

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

// DraftGroup -> editable form state (id carries the localId).
export function groupDraftFromNode(group: DraftGroup): GroupDraft {
	return {
		id: group.localId,
		name: group.name,
		attributes: group.attributes.length > 0 ? group.attributes : [''],
		resource: group.resource,
		enabled: group.enabled,
	};
}

// DraftMapper -> editable form state (id carries the localId).
export function mapperDraftFromNode(mapper: DraftMapper): MapperDraft {
	return {
		id: mapper.localId,
		name: mapper.name,
		fieldContext: mapper.fieldContext,
		sources:
			mapper.sources.length > 0
				? mapper.sources.map((source) => ({ ...source }))
				: [createEmptySource()],
		enabled: mapper.enabled,
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
		mappers: existing?.mappers ?? [],
	};
}

export function nodeFromMapperDraft(
	draft: MapperDraft,
	existing?: DraftMapper,
): DraftMapper {
	return {
		localId: existing?.localId ?? genLocalId('mapper'),
		serverId: existing?.serverId ?? null,
		name: draft.name.trim(),
		fieldContext: draft.fieldContext,
		sources: getCleanSources(draft),
		enabled: draft.enabled,
	};
}
