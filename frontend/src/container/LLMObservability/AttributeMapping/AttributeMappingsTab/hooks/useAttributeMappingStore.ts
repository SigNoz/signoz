import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cloneDeep, isEqual } from 'lodash-es';
import { toast } from '@signozhq/ui/sonner';
import { useQueryClient } from 'react-query';
import {
	useCreateSpanMapper,
	useCreateSpanMapperGroup,
	useDeleteSpanMapper,
	useDeleteSpanMapperGroup,
	useListSpanMapperGroups,
	useUpdateSpanMapper,
	useUpdateSpanMapperGroup,
} from 'api/generated/services/spanmapper';

import { persistDraft, SaveMutations } from '../../saveDraft';
import {
	DraftGroup,
	GroupDraft,
	Mapper,
	MapperDraft,
	MapperGroup,
} from '../../types';
import {
	buildDraftGroup,
	buildDraftMapper,
	nodeFromGroupDraft,
	nodeFromMapperDraft,
} from '../../utils';

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
	hydrateGroupMappers: (groupServerId: string, mappers: Mapper[]) => void;
	upsertMapper: (groupLocalId: string, draft: MapperDraft) => void;
	removeMapper: (groupLocalId: string, mapperLocalId: string) => void;
	toggleMapper: (
		groupLocalId: string,
		mapperLocalId: string,
		enabled: boolean,
	) => void;
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

	// A group's mappers are fetched lazily when its row is first expanded (see
	// MappersTable -> hydrateGroupMappers) and cached here, keyed by group server
	// id. Page load stays a single groups request — never an N+1 fan-out across
	// every group.
	const [loadedMappers, setLoadedMappers] = useState<Record<string, Mapper[]>>(
		{},
	);
	const loadedRef = useRef<Set<string>>(new Set());

	const snapshot = useMemo<DraftGroup[]>(() => {
		if (!ready) {
			return [];
		}
		return serverGroups.map((group) =>
			buildDraftGroup(group, loadedMappers[group.id] ?? []),
		);
	}, [ready, serverGroups, loadedMappers]);

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
	const { mutateAsync: createMapper } = useCreateSpanMapper();
	const { mutateAsync: updateMapper } = useUpdateSpanMapper();
	const { mutateAsync: deleteMapper } = useDeleteSpanMapper();

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
			createMapper: async (groupId, data): Promise<void> => {
				await createMapper({ pathParams: { groupId }, data });
			},
			updateMapper: async (groupId, mapperId, data): Promise<void> => {
				await updateMapper({ pathParams: { groupId, mapperId }, data });
			},
			deleteMapper: async (groupId, mapperId): Promise<void> => {
				await deleteMapper({ pathParams: { groupId, mapperId } });
			},
		}),
		[
			createGroup,
			updateGroup,
			deleteGroup,
			createMapper,
			updateMapper,
			deleteMapper,
		],
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

	// Fold a group's freshly-fetched server mappers into both the snapshot
	// baseline and the working draft, exactly once per group (the guard skips
	// re-expands). The "Add mapping" affordance renders while the fetch is still
	// in flight, so a user can stage a new mapper (serverId === null) before the
	// server list arrives — those unsaved rows are preserved, with the server
	// mappers folded in ahead of them, so a racing add isn't clobbered.
	const hydrateGroupMappers = useCallback(
		(groupServerId: string, mappers: Mapper[]): void => {
			if (loadedRef.current.has(groupServerId)) {
				return;
			}
			loadedRef.current.add(groupServerId);
			setLoadedMappers((prev) => ({ ...prev, [groupServerId]: mappers }));
			setDraft((prev) =>
				prev === null
					? prev
					: prev.map((group) =>
							group.serverId === groupServerId
								? {
										...group,
										mappers: [
											...mappers.map(buildDraftMapper),
											...group.mappers.filter((mapper) => mapper.serverId === null),
										],
									}
								: group,
						),
			);
		},
		[],
	);

	const upsertMapper = useCallback(
		(groupLocalId: string, mapperDraft: MapperDraft): void => {
			setDraft((prev) =>
				(prev ?? []).map((group) => {
					if (group.localId !== groupLocalId) {
						return group;
					}
					if (mapperDraft.id) {
						return {
							...group,
							mappers: group.mappers.map((mapper) =>
								mapper.localId === mapperDraft.id
									? nodeFromMapperDraft(mapperDraft, mapper)
									: mapper,
							),
						};
					}
					return {
						...group,
						mappers: [...group.mappers, nodeFromMapperDraft(mapperDraft)],
					};
				}),
			);
		},
		[],
	);

	const removeMapper = useCallback(
		(groupLocalId: string, mapperLocalId: string): void => {
			setDraft((prev) =>
				(prev ?? []).map((group) =>
					group.localId === groupLocalId
						? {
								...group,
								mappers: group.mappers.filter(
									(mapper) => mapper.localId !== mapperLocalId,
								),
							}
						: group,
				),
			);
		},
		[],
	);

	const toggleMapper = useCallback(
		(groupLocalId: string, mapperLocalId: string, enabled: boolean): void => {
			setDraft((prev) =>
				(prev ?? []).map((group) =>
					group.localId === groupLocalId
						? {
								...group,
								mappers: group.mappers.map((mapper) =>
									mapper.localId === mapperLocalId ? { ...mapper, enabled } : mapper,
								),
							}
						: group,
				),
			);
		},
		[],
	);

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
			// swaps in fresh data without a loading flash. Exact-match the key so
			// this doesn't also touch the per-group mapper lists (handled below).
			await queryClient.invalidateQueries({
				predicate: (query) => query.queryKey?.[0] === GROUPS_KEY_PREFIX,
			});
			// Reset the working copy and the lazily-loaded mapper mirror *before*
			// the mapper queries re-emit, so the re-hydrate isn't clobbered.
			loadedRef.current = new Set();
			setLoadedMappers({});
			setDraft(null);
			// removeQueries (not invalidate) for the per-group mapper lists: an
			// expanded group's table only re-hydrates when its query `data` changes
			// reference, but react-query's structural sharing keeps `data` stable
			// when the list is unchanged — so invalidate alone leaves the table
			// empty. Removing the cache forces undefined -> refetch -> fresh, which
			// always fires the hydrate effect. Also fixes stale mappers on re-expand.
			queryClient.removeQueries({
				predicate: (query) =>
					typeof query.queryKey?.[0] === 'string' &&
					(query.queryKey[0] as string).startsWith(`${GROUPS_KEY_PREFIX}/`),
			});
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
		hydrateGroupMappers,
		upsertMapper,
		removeMapper,
		toggleMapper,
		save,
		discard,
	};
}
