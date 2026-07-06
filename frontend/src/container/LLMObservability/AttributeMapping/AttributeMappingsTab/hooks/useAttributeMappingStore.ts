import { useCallback, useEffect, useMemo, useState } from 'react';
import { cloneDeep, isEqual } from 'lodash-es';
import { toast } from '@signozhq/ui/sonner';
import { useQueryClient } from 'react-query';
import {
	useCreateSpanMapperGroup,
	useDeleteSpanMapperGroup,
	useListSpanMapperGroups,
	useUpdateSpanMapperGroup,
} from 'api/generated/services/spanmapper';

import { persistDraft, SaveMutations } from '../../saveDraft';
import { DraftGroup, GroupDraft, MapperGroup } from '../../types';
import { buildDraftGroup, nodeFromGroupDraft } from '../../utils';

const GROUPS_KEY_PREFIX = '/api/v1/span_mapper_groups';

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

export function useAttributeMappingStore(): AttributeMappingStore {
	const queryClient = useQueryClient();

	const groupsQuery = useListSpanMapperGroups();
	const serverGroups: MapperGroup[] = useMemo(
		() => groupsQuery.data?.data?.items ?? [],
		[groupsQuery.data],
	);

	const ready = !groupsQuery.isLoading;

	// Groups only: a group's mappers are fetched lazily when its row is expanded
	// (see MappersTable), so page load is a single request rather than an N+1
	// fan-out across every group. Group edits (name/condition/enabled, create/
	// delete) don't touch mappers; mapper reconciliation lands in a later PR.
	const snapshot = useMemo<DraftGroup[]>(() => {
		if (!ready) {
			return [];
		}
		return serverGroups.map((group) => buildDraftGroup(group, []));
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
			await queryClient.invalidateQueries({
				predicate: (query) =>
					typeof query.queryKey?.[0] === 'string' &&
					(query.queryKey[0] as string).startsWith(GROUPS_KEY_PREFIX),
			});
			// Re-initialise the working copy from the freshly-fetched server data.
			setDraft(null);
			toast.success('Attribute mapping changes saved');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Save failed';
			setSaveError(message);
			toast.error(`Failed to save changes: ${message}`);
		} finally {
			setIsSaving(false);
		}
	}, [draft, snapshot, mutations, queryClient]);

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
