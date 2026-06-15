import {
	SpantypesPostableSpanMapperDTO,
	SpantypesPostableSpanMapperGroupDTO,
	SpantypesUpdatableSpanMapperDTO,
	SpantypesUpdatableSpanMapperGroupDTO,
} from 'api/generated/services/sigNoz.schemas';
import dayjs from 'dayjs';

import {
	ConditionFilter,
	FieldContext,
	GroupDraft,
	Mapper,
	MapperDraft,
	MapperGroup,
	MapperOperation,
} from './types';

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

// Flattens a group's condition into display clauses. The backend matches a
// group when any span attribute OR resource key CONTAINS one of these
// substrings, so each entry is shown as a "contains" filter.
export function getConditionFilters(group: MapperGroup): ConditionFilter[] {
	const condition = group.condition;
	if (!condition) {
		return [];
	}

	const attributeFilters: ConditionFilter[] = (condition.attributes ?? []).map(
		(key) => ({ context: 'attribute', key }),
	);
	const resourceFilters: ConditionFilter[] = (condition.resource ?? []).map(
		(key) => ({ context: 'resource', key }),
	);

	return [...attributeFilters, ...resourceFilters];
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

export function draftFromMapper(mapper: Mapper): MapperDraft {
	const sources = getMapperSourceKeys(mapper);
	return {
		id: mapper.id,
		name: mapper.name,
		sources: sources.length > 0 ? sources : [''],
		enabled: mapper.enabled,
	};
}

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

export function draftFromGroup(group: MapperGroup): GroupDraft {
	const attributes = group.condition?.attributes ?? [];
	return {
		id: group.id,
		name: group.name,
		attributes: attributes.length > 0 ? attributes : [''],
		enabled: group.enabled,
	};
}

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
