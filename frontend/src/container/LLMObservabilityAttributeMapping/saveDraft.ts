import {
	SpantypesPostableSpanMapperDTO,
	SpantypesPostableSpanMapperGroupDTO,
	SpantypesUpdatableSpanMapperDTO,
	SpantypesUpdatableSpanMapperGroupDTO,
} from 'api/generated/services/sigNoz.schemas';

import { DraftGroup, DraftMapper } from './types';
import {
	buildPostableGroup,
	buildPostableMapper,
	buildUpdatableGroup,
	buildUpdatableMapper,
} from './utils';

// Thin persistence surface the store wires to the generated mutations.
// createGroup returns the new server id so its mappers can be created under it.
export interface SaveMutations {
	createGroup: (data: SpantypesPostableSpanMapperGroupDTO) => Promise<string>;
	updateGroup: (
		groupId: string,
		data: SpantypesUpdatableSpanMapperGroupDTO,
	) => Promise<void>;
	deleteGroup: (groupId: string) => Promise<void>;
	createMapper: (
		groupId: string,
		data: SpantypesPostableSpanMapperDTO,
	) => Promise<void>;
	updateMapper: (
		groupId: string,
		mapperId: string,
		data: SpantypesUpdatableSpanMapperDTO,
	) => Promise<void>;
	deleteMapper: (groupId: string, mapperId: string) => Promise<void>;
}

function arraysEqual(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((value, index) => value === b[index]);
}

function groupChanged(snapshot: DraftGroup, draft: DraftGroup): boolean {
	return (
		snapshot.name !== draft.name ||
		snapshot.enabled !== draft.enabled ||
		!arraysEqual(snapshot.attributes, draft.attributes)
	);
}

function mapperChanged(snapshot: DraftMapper, draft: DraftMapper): boolean {
	return (
		snapshot.enabled !== draft.enabled ||
		!arraysEqual(snapshot.sources, draft.sources)
	);
}

function groupDraftOf(
	node: DraftGroup,
): Parameters<typeof buildPostableGroup>[0] {
	return {
		id: node.serverId,
		name: node.name,
		attributes: node.attributes,
		enabled: node.enabled,
	};
}

function mapperDraftOf(
	node: DraftMapper,
): Parameters<typeof buildPostableMapper>[0] {
	return {
		id: node.serverId,
		name: node.name,
		sources: node.sources,
		enabled: node.enabled,
	};
}

async function persistMappers(
	groupServerId: string,
	snapshotMappers: DraftMapper[],
	draftMappers: DraftMapper[],
	m: SaveMutations,
): Promise<void> {
	const snapById = new Map(
		snapshotMappers
			.filter((mapper) => mapper.serverId)
			.map((mapper) => [mapper.serverId as string, mapper]),
	);
	const draftServerIds = new Set(
		draftMappers
			.filter((mapper) => mapper.serverId)
			.map((mapper) => mapper.serverId as string),
	);

	// Deleted mappers.
	await Promise.all(
		snapshotMappers
			.filter((mapper) => mapper.serverId && !draftServerIds.has(mapper.serverId))
			.map((mapper) => m.deleteMapper(groupServerId, mapper.serverId as string)),
	);

	// Created + updated mappers (sequential to keep ordering deterministic).
	for (const mapper of draftMappers) {
		if (!mapper.serverId) {
			// eslint-disable-next-line no-await-in-loop
			await m.createMapper(
				groupServerId,
				buildPostableMapper(mapperDraftOf(mapper)),
			);
		} else {
			const snap = snapById.get(mapper.serverId);
			if (!snap || mapperChanged(snap, mapper)) {
				// eslint-disable-next-line no-await-in-loop
				await m.updateMapper(
					groupServerId,
					mapper.serverId,
					buildUpdatableMapper(mapperDraftOf(mapper)),
				);
			}
		}
	}
}

// Diffs the staged tree against the server snapshot and issues the minimal set
// of create/update/delete calls to reconcile them.
export async function persistDraft(
	snapshot: DraftGroup[],
	draft: DraftGroup[],
	m: SaveMutations,
): Promise<void> {
	const snapById = new Map(
		snapshot
			.filter((group) => group.serverId)
			.map((group) => [group.serverId as string, group]),
	);
	const draftServerIds = new Set(
		draft
			.filter((group) => group.serverId)
			.map((group) => group.serverId as string),
	);

	// Deleted groups (cascades mappers server-side).
	await Promise.all(
		snapshot
			.filter((group) => group.serverId && !draftServerIds.has(group.serverId))
			.map((group) => m.deleteGroup(group.serverId as string)),
	);

	for (const group of draft) {
		if (!group.serverId) {
			// eslint-disable-next-line no-await-in-loop
			const newId = await m.createGroup(buildPostableGroup(groupDraftOf(group)));
			// eslint-disable-next-line no-await-in-loop
			await persistMappers(newId, [], group.mappers, m);
			continue;
		}

		const snap = snapById.get(group.serverId);
		if (!snap || groupChanged(snap, group)) {
			// eslint-disable-next-line no-await-in-loop
			await m.updateGroup(
				group.serverId,
				buildUpdatableGroup(groupDraftOf(group)),
			);
		}
		// eslint-disable-next-line no-await-in-loop
		await persistMappers(group.serverId, snap?.mappers ?? [], group.mappers, m);
	}
}
