import { useCallback, useEffect, useMemo, useState } from 'react';
import { cloneDeep, isEqual } from 'lodash-es';
import { toast } from '@signozhq/ui/sonner';
import {
	useCreateSpanMapperGroup,
	useDeleteSpanMapperGroup,
	useListSpanMapperGroups,
	useUpdateSpanMapperGroup,
} from 'api/generated/services/spanmapper';

import { persistDraft, SaveMutations } from '../../saveDraft';
import { DraftGroup, GroupDraft, MapperGroup } from '../../types';
import { buildDraftGroup, nodeFromGroupDraft } from '../../utils';

function clone(groups: DraftGroup[]): DraftGroup[] {
	return cloneDeep(groups);
}

export interface AttributeMappingStore {
	groups: DraftGroup[];
	isLoading: boolean;
	isError: boolean;
	isDirty: boolean;
	isSaving: boolean;
	saveError: string | null;
	upsertGroup: (draft: GroupDraft) => void;
	removeGroup: (localId: string) => void;
	toggleGroup: (localId: string, enabled: boolean) => void;
	save: () => Promise<void>;
	discard: () => void;
}

// Staged-edit store for the mapping groups: the server list is snapshotted
// into a local working copy, group edits (add/edit/delete/toggle) mutate the
// copy, and save diffs it back against the snapshot (see saveDraft). Each
// group's mappers are fetched lazily when its panel is expanded (see
// GroupMappers) and stay read-only — mapper editing lands in a later PR.
export function useAttributeMappingStore(): AttributeMappingStore {
	const groupsQuery = useListSpanMapperGroups();
	const { refetch: refetchGroups } = groupsQuery;
	const serverGroups: MapperGroup[] = useMemo(
		() => groupsQuery.data?.data?.items ?? [],
		[groupsQuery.data],
	);

	const ready = !groupsQuery.isLoading;

	const snapshot = useMemo<DraftGroup[]>(() => {
		if (!ready) {
			return [];
		}
		return serverGroups.map(buildDraftGroup);
	}, [ready, serverGroups]);

	const [draft, setDraft] = useState<DraftGroup[] | null>(null);

	// Initialise the working copy once data is ready (and re-init after a save
	// clears it). Never clobbers in-flight edits — only runs when draft is null.
	useEffect(() => {
		if (ready && draft === null) {
			setDraft(clone(snapshot));
		}
	}, [ready, draft, snapshot]);

	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const { mutateAsync: createGroup } = useCreateSpanMapperGroup();
	const { mutateAsync: updateGroup } = useUpdateSpanMapperGroup();
	const { mutateAsync: deleteGroup } = useDeleteSpanMapperGroup();

	const mutations: SaveMutations = useMemo(
		() => ({
			createGroup: async (data): Promise<string> => {
				const result = await createGroup({ data });
				return result.data.id;
			},
			updateGroup: async (groupId, data): Promise<void> => {
				await updateGroup({ pathParams: { groupId }, data });
			},
			deleteGroup: async (groupId): Promise<void> => {
				await deleteGroup({ pathParams: { groupId } });
			},
		}),
		[createGroup, updateGroup, deleteGroup],
	);

	const upsertGroup = useCallback((groupDraft: GroupDraft): void => {
		setDraft((prev) => {
			const groups = prev ?? [];
			if (groupDraft.id) {
				return groups.map((group) =>
					group.localId === groupDraft.id
						? nodeFromGroupDraft(groupDraft, group)
						: group,
				);
			}
			return [...groups, nodeFromGroupDraft(groupDraft)];
		});
	}, []);

	const removeGroup = useCallback((localId: string): void => {
		setDraft((prev) => (prev ?? []).filter((group) => group.localId !== localId));
	}, []);

	const toggleGroup = useCallback((localId: string, enabled: boolean): void => {
		setDraft((prev) =>
			(prev ?? []).map((group) =>
				group.localId === localId ? { ...group, enabled } : group,
			),
		);
	}, []);

	const discard = useCallback((): void => {
		setSaveError(null);
		setDraft(clone(snapshot));
	}, [snapshot]);

	const save = useCallback(async (): Promise<void> => {
		if (!draft) {
			return;
		}
		setIsSaving(true);
		setSaveError(null);
		try {
			await persistDraft(snapshot, draft, mutations);
			// Refetch the groups list in place — it stays mounted, so this just
			// swaps in fresh data without a loading flash. Scoped to this query by
			// construction, so it leaves the per-group mapper lists alone (mappers
			// aren't edited here, and a deleted group unmounts its panel anyway).
			await refetchGroups();
			// Reset the working copy so the effect above re-seeds it from the
			// fresh snapshot (new server ids included).
			setDraft(null);
			toast.success('Attribute mapping changes saved');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Save failed';
			setSaveError(message);
			toast.error(`Failed to save changes: ${message}`);
		} finally {
			setIsSaving(false);
		}
	}, [draft, snapshot, mutations, refetchGroups]);

	const isDirty = useMemo(
		() => draft !== null && !isEqual(draft, snapshot),
		[draft, snapshot],
	);

	return {
		groups: draft ?? [],
		isLoading: !ready || draft === null,
		isError: groupsQuery.isError,
		isDirty,
		isSaving,
		saveError,
		upsertGroup,
		removeGroup,
		toggleGroup,
		save,
		discard,
	};
}
