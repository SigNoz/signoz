import {
	SpantypesPostableSpanMapperTestDTO,
	SpantypesPostableSpanMapperTestGroupDTO,
	SpantypesSpanMapperTestSpanDTO,
} from 'api/generated/services/sigNoz.schemas';
import { isEqual } from 'lodash-es';

import { DraftGroup } from '../types';
import {
	buildPostableGroup,
	buildPostableMapper,
	groupDraftFromNode,
	mapperDraftFromNode,
} from '../utils';

function shouldSendMappers(
	snap: DraftGroup | undefined,
	group: DraftGroup,
): boolean {
	if (!snap) {
		return true;
	}
	return !isEqual(snap.mappers, group.mappers);
}

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSpanEnvelope(parsed: Record<string, unknown>): boolean {
	const keys = Object.keys(parsed);
	return (
		keys.length > 0 &&
		keys.every((key) => key === 'attributes' || key === 'resource') &&
		(isPlainObject(parsed.attributes) || isPlainObject(parsed.resource))
	);
}

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

	if (!isPlainObject(parsed)) {
		throw new Error('Span must be a JSON object of attribute key-value pairs.');
	}

	if (isSpanEnvelope(parsed)) {
		return {
			attributes: isPlainObject(parsed.attributes) ? parsed.attributes : {},
			resource: isPlainObject(parsed.resource) ? parsed.resource : {},
		};
	}

	return { attributes: parsed, resource: {} };
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

// Renders a diff value for display: strings as-is, everything else JSON-encoded.
export function formatAttributeValue(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}
	return JSON.stringify(value);
}

export function diffAttributeMaps(
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
		} else if (!isEqual(inputAttributes[key], value)) {
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
