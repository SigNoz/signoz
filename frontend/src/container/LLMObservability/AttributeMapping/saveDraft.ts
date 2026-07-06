import { isEqual } from 'lodash-es';
import {
	SpantypesPostableSpanMapperGroupDTO,
	SpantypesUpdatableSpanMapperGroupDTO,
} from 'api/generated/services/sigNoz.schemas';

import { DraftGroup } from './types';
import { buildPostableGroup, buildUpdatableGroup } from './utils';

// Thin persistence surface the store wires to the generated mutations.
// createGroup returns the new server id (mapper persistence is layered on in a
// later PR).
export interface SaveMutations {
	createGroup: (data: SpantypesPostableSpanMapperGroupDTO) => Promise<string>;
	updateGroup: (
		groupId: string,
		data: SpantypesUpdatableSpanMapperGroupDTO,
	) => Promise<void>;
	deleteGroup: (groupId: string) => Promise<void>;
}

function groupChanged(snapshot: DraftGroup, draft: DraftGroup): boolean {
	return (
		snapshot.name !== draft.name ||
		snapshot.enabled !== draft.enabled ||
		!isEqual(snapshot.attributes, draft.attributes) ||
		!isEqual(snapshot.resource, draft.resource)
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

// Diffs the staged groups against the server snapshot and issues the minimal
// set of create/update/delete calls to reconcile them. Mapper reconciliation
// is added in a later PR.
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

	// Apply additive work (creates/updates) before deletes, so a failure here
	// leaves at worst an incomplete set of additions rather than groups that
	// were deleted with no replacement persisted. Deletes are irreversible
	// (they cascade mappers server-side), so we do them last, once everything
	// else has succeeded.
	for (const group of draft) {
		if (!group.serverId) {
			// eslint-disable-next-line no-await-in-loop
			await m.createGroup(buildPostableGroup(groupDraftOf(group)));
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
	}

	// Deleted groups (cascades mappers server-side).
	await Promise.all(
		snapshot
			.filter((group) => group.serverId && !draftServerIds.has(group.serverId))
			.map((group) => m.deleteGroup(group.serverId as string)),
	);
}
