import {
	SpantypesPostableSpanMapperTestDTO,
	SpantypesPostableSpanMapperTestGroupDTO,
	SpantypesSpanMapperTestSpanDTO,
} from 'api/generated/services/sigNoz.schemas';

import { DraftGroup } from './types';
import {
	buildPostableGroup,
	buildPostableMapper,
	groupDraftFromNode,
	mapperDraftFromNode,
} from './utils';

// A group's mappers must be sent in full when the group is new (the backend has
// no saved group of that name to backfill from) or when its mapper set has
// diverged from the saved baseline. Otherwise we omit them and let the backend
// load the saved mappers by group name — which also covers groups whose rows
// were never expanded (their draft carries no mappers yet).
function shouldSendMappers(
	snap: DraftGroup | undefined,
	group: DraftGroup,
): boolean {
	if (!snap) {
		return true;
	}
	return JSON.stringify(snap.mappers) !== JSON.stringify(group.mappers);
}

// Builds the `groups` portion of the test request from the working draft,
// sending each group's name/enabled/condition from the current draft and its
// `mappers` only when they changed (null otherwise → backend backfills).
export function buildTestGroups(
	snapshot: DraftGroup[],
	draft: DraftGroup[],
): SpantypesPostableSpanMapperTestGroupDTO[] {
	const snapById = new Map(
		snapshot
			.filter((group) => group.serverId)
			.map((group) => [group.serverId as string, group]),
	);

	return draft.map((group) => {
		const base = buildPostableGroup(groupDraftFromNode(group));
		const snap = group.serverId ? snapById.get(group.serverId) : undefined;
		return {
			...base,
			mappers: shouldSendMappers(snap, group)
				? group.mappers.map((mapper) =>
						buildPostableMapper(mapperDraftFromNode(mapper)),
					)
				: null,
		};
	});
}

// Parses the pasted JSON into a single test span. The pasted object is treated
// as the span's attribute map (matching the sample shown to the user); resource
// is left empty. Throws a friendly error on anything that isn't a JSON object.
export function parseSpanInput(input: string): SpantypesSpanMapperTestSpanDTO {
	const trimmed = input.trim();
	if (!trimmed) {
		throw new Error('Paste a JSON span object to run the test.');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		throw new Error(
			'Invalid JSON — check for trailing commas or missing quotes.',
		);
	}

	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('Span must be a JSON object of attribute key-value pairs.');
	}

	return { attributes: parsed as Record<string, unknown>, resource: {} };
}

export function buildTestRequest(
	snapshot: DraftGroup[],
	draft: DraftGroup[],
	input: string,
): SpantypesPostableSpanMapperTestDTO {
	return {
		groups: buildTestGroups(snapshot, draft),
		spans: [parseSpanInput(input)],
	};
}

export type AttrChangeStatus = 'added' | 'changed' | 'unchanged' | 'removed';

export interface AttrDiffEntry {
	key: string;
	value: unknown;
	status: AttrChangeStatus;
}

function valuesEqual(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

// Diffs the span attributes a user pasted against the attributes the mappers
// produced, so the UI can highlight which target keys got populated ('added'),
// which source keys were consumed by a move ('removed'), and what stayed.
// Added keys (the populated targets) sort first as the primary signal.
export function diffSpanAttributes(
	inputAttributes: Record<string, unknown>,
	resultAttributes: Record<string, unknown>,
): AttrDiffEntry[] {
	const added: AttrDiffEntry[] = [];
	const changed: AttrDiffEntry[] = [];
	const unchanged: AttrDiffEntry[] = [];
	const removed: AttrDiffEntry[] = [];

	Object.entries(resultAttributes).forEach(([key, value]) => {
		if (!(key in inputAttributes)) {
			added.push({ key, value, status: 'added' });
		} else if (!valuesEqual(inputAttributes[key], value)) {
			changed.push({ key, value, status: 'changed' });
		} else {
			unchanged.push({ key, value, status: 'unchanged' });
		}
	});

	Object.entries(inputAttributes).forEach(([key, value]) => {
		if (!(key in resultAttributes)) {
			removed.push({ key, value, status: 'removed' });
		}
	});

	return [...added, ...changed, ...unchanged, ...removed];
}
