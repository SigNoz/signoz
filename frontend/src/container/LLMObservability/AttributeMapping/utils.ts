import {
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
		.sort((a, b) => b.priority - a.priority)
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

// A full group payload is also a valid partial-update payload (all updatable
// fields are present), so we reuse the postable builder.
export function buildUpdatableGroup(
	draft: GroupDraft,
): SpantypesUpdatableSpanMapperGroupDTO {
	return buildPostableGroup(draft);
}

// ---- working-copy (draft list) helpers ----

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

// Form state -> working-copy node. Reuses cleanKeys so the staged list already
// holds normalized values.
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
