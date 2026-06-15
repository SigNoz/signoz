import {
	SpantypesPostableSpanMapperDTO,
	SpantypesPostableSpanMapperGroupDTO,
	SpantypesUpdatableSpanMapperDTO,
	SpantypesUpdatableSpanMapperGroupDTO,
} from 'api/generated/services/sigNoz.schemas';
import dayjs from 'dayjs';
import { v4 as uuid } from 'uuid';

import {
	ConditionFilter,
	DraftGroup,
	DraftMapper,
	FieldContext,
	GroupDraft,
	Mapper,
	MapperDraft,
	MapperGroup,
	MapperOperation,
} from './types';

// Client-side id for not-yet-persisted rows. Prefixed so it never collides
// with a server UUID and is easy to spot in logs.
export function genLocalId(prefix: 'group' | 'mapper'): string {
	return `local-${prefix}-${uuid()}`;
}

// Trimmed, de-duplicated, non-empty keys preserving input order.
export function cleanKeys(keys: string[]): string[] {
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

// Display clauses for a draft group's staged attribute keys. The draft model
// only edits span-attribute keys, so every clause has 'attribute' context.
export function conditionFiltersFromAttributes(
	attributes: string[],
): ConditionFilter[] {
	return attributes.map((key) => ({ context: 'attribute', key }));
}

// Source attribute keys for a mapper, highest priority first (first match
// wins at evaluation time).
export function getMapperSourceKeys(mapper: Mapper): string[] {
	const sources = mapper.config?.sources ?? [];
	return [...sources]
		.sort((a, b) => b.priority - a.priority)
		.map((source) => source.key);
}

export function formatTimestamp(iso?: string): string {
	if (!iso) {
		return '—';
	}
	return dayjs(iso).format('MMM D, YYYY HH:mm');
}

export const EMPTY_MAPPER_DRAFT: MapperDraft = {
	id: null,
	name: '',
	sources: [''],
	enabled: true,
};

// Trimmed, de-duplicated, non-empty source keys in draft (priority) order.
export function getCleanSourceKeys(draft: MapperDraft): string[] {
	return cleanKeys(draft.sources);
}

export function isMapperDraftValid(draft: MapperDraft): boolean {
	return draft.name.trim().length > 0 && getCleanSourceKeys(draft).length > 0;
}

// For MVP every source is copied from a span attribute; priority is derived
// from list order so the first row wins.
function buildSources(
	draft: MapperDraft,
): SpantypesPostableSpanMapperDTO['config']['sources'] {
	const keys = getCleanSourceKeys(draft);
	return keys.map((key, index) => ({
		key,
		context: FieldContext.attribute,
		operation: MapperOperation.copy,
		priority: keys.length - index,
	}));
}

export function buildPostableMapper(
	draft: MapperDraft,
): SpantypesPostableSpanMapperDTO {
	return {
		name: draft.name.trim(),
		fieldContext: FieldContext.attribute,
		enabled: draft.enabled,
		config: { sources: buildSources(draft) },
	};
}

// The target name is immutable on update (UpdatableSpanMapper has no name).
export function buildUpdatableMapper(
	draft: MapperDraft,
): SpantypesUpdatableSpanMapperDTO {
	return {
		fieldContext: FieldContext.attribute,
		enabled: draft.enabled,
		config: { sources: buildSources(draft) },
	};
}

export const EMPTY_GROUP_DRAFT: GroupDraft = {
	id: null,
	name: '',
	attributes: [''],
	enabled: true,
};

export function isGroupDraftValid(draft: GroupDraft): boolean {
	return draft.name.trim().length > 0;
}

// Resource keys are left empty for the LLM use case; only span-attribute keys
// gate the group.
export function buildPostableGroup(
	draft: GroupDraft,
): SpantypesPostableSpanMapperGroupDTO {
	return {
		name: draft.name.trim(),
		enabled: draft.enabled,
		condition: { attributes: cleanKeys(draft.attributes), resource: [] },
	};
}

// A full group payload is also a valid partial-update payload (all updatable
// fields are present), so we reuse the postable builder.
export function buildUpdatableGroup(
	draft: GroupDraft,
): SpantypesUpdatableSpanMapperGroupDTO {
	return buildPostableGroup(draft);
}

// ---- working-copy (draft tree) helpers ----

export function buildDraftMapper(mapper: Mapper): DraftMapper {
	return {
		localId: mapper.id,
		serverId: mapper.id,
		name: mapper.name,
		sources: getMapperSourceKeys(mapper),
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
		enabled: group.enabled,
	};
}

// DraftMapper -> editable form state (id carries the localId).
export function mapperDraftFromNode(mapper: DraftMapper): MapperDraft {
	return {
		id: mapper.localId,
		name: mapper.name,
		sources: mapper.sources.length > 0 ? mapper.sources : [''],
		enabled: mapper.enabled,
	};
}

// Form state -> working-copy node. Reuses cleanKeys/getCleanSourceKeys so the
// staged tree already holds normalized values.
export function nodeFromGroupDraft(
	draft: GroupDraft,
	existing?: DraftGroup,
): DraftGroup {
	return {
		localId: existing?.localId ?? genLocalId('group'),
		serverId: existing?.serverId ?? null,
		name: draft.name.trim(),
		attributes: cleanKeys(draft.attributes),
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
		sources: getCleanSourceKeys(draft),
		enabled: draft.enabled,
	};
}
