import { isEqual } from 'lodash-es';
import {
	SpantypesPostableSpanMapperDTO,
	SpantypesPostableSpanMapperGroupDTO,
	SpantypesUpdatableSpanMapperDTO,
	SpantypesUpdatableSpanMapperGroupDTO,
} from 'api/generated/services/sigNoz.schemas';

import { DraftGroup, DraftMapper, SourceConfig } from './types';
import {
	buildPostableGroup,
	buildPostableMapper,
	buildUpdatableGroup,
	buildUpdatableMapper,
} from './utils';

// Thin persistence surface the editor wires to the generated mutations.
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

function sourcesEqual(a: SourceConfig[], b: SourceConfig[]): boolean {
	return (
		a.length === b.length &&
		a.every(
			(source, index) =>
				source.key === b[index].key &&
				source.context === b[index].context &&
				source.operation === b[index].operation,
		)
	);
}

function groupChanged(snapshot: DraftGroup, draft: DraftGroup): boolean {
	return (
		snapshot.name !== draft.name ||
		snapshot.enabled !== draft.enabled ||
		!isEqual(snapshot.attributes, draft.attributes) ||
		!isEqual(snapshot.resource, draft.resource)
	);
}

function mapperChanged(snapshot: DraftMapper, draft: DraftMapper): boolean {
	return (
		snapshot.enabled !== draft.enabled ||
		snapshot.fieldContext !== draft.fieldContext ||
		!sourcesEqual(snapshot.sources, draft.sources)
	);
}

function groupDraftOf(
	node: DraftGroup,
): Parameters<typeof buildPostableGroup>[0] {
	return {
		id: node.serverId,
		name: node.name,
		attributes: node.attributes,
		resource: node.resource,
		enabled: node.enabled,
	};
}

function mapperDraftOf(
	node: DraftMapper,
): Parameters<typeof buildPostableMapper>[0] {
	return {
		id: node.serverId,
		name: node.name,
		fieldContext: node.fieldContext,
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

	// Creates/updates before deletes (see persistDraft). Sequential for
	// deterministic ordering.
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

	// Deletes last.
	await Promise.all(
		snapshotMappers
			.filter((mapper) => mapper.serverId && !draftServerIds.has(mapper.serverId))
			.map((mapper) => m.deleteMapper(groupServerId, mapper.serverId as string)),
	);
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

	// Creates/updates before deletes: a mid-save failure then leaves incomplete
	// additions rather than groups deleted with no replacement. Deletes are
	// irreversible (cascade mappers server-side), so they run last.
	//
	// Names are unique per scope, so deleting and recreating the same name in
	// one save collides and errors — recoverable by splitting across two saves,
	// which we favour over the data loss delete-first would risk.
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

	// Deleted groups (cascades mappers server-side).
	await Promise.all(
		snapshot
			.filter((group) => group.serverId && !draftServerIds.has(group.serverId))
			.map((group) => m.deleteGroup(group.serverId as string)),
	);
}
