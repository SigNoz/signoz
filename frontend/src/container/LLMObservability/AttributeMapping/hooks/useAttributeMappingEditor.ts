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

import { persistDraft, SaveMutations } from '../saveDraft';
import {
	DraftGroup,
	GroupDraft,
	Mapper,
	MapperDraft,
	MapperGroup,
} from '../types';
import {
	buildDraftGroup,
	buildDraftMapper,
	nodeFromGroupDraft,
	nodeFromMapperDraft,
} from '../utils';

const GROUPS_KEY_PREFIX = '/api/v1/span_mapper_groups';

function clone(groups: DraftGroup[]): DraftGroup[] {
	return cloneDeep(groups);
}

export interface AttributeMappingEditor {
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

export function useAttributeMappingEditor(): AttributeMappingEditor {
	const queryClient = useQueryClient();

	const groupsQuery = useListSpanMapperGroups();
	const { refetch: refetchGroups } = groupsQuery;
	const serverGroups: MapperGroup[] = useMemo(
		() => groupsQuery.data?.data?.items ?? [],
		[groupsQuery.data],
	);

	const ready = !groupsQuery.isLoading;

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
			// Refresh the groups list in place — it stays mounted, so this just
			// swaps in fresh data without a loading flash. Using the query's own
			// refetch keeps it scoped to the groups list; the per-group mapper
			// caches are handled separately below (mappers can change here, so
			// their cached lists must be dropped rather than left stale).
			const { isError: refreshFailed } = await refetchGroups();
			if (refreshFailed) {
				toast.warning(
					'Changes saved, but the list failed to refresh. Reload to see the latest.',
				);
				return;
			}
			// Reset the mapper-load tracking so expanded groups re-hydrate from
			// the fresh server data.
			loadedRef.current = new Set();
			setLoadedMappers({});
			// Reset the working copy so the effect above re-seeds it from the
			// fresh snapshot (new server ids included).
			setDraft(null);
			// Evict the cached per-group mapper lists so an expanded group
			// refetches its mappers against the fresh server state.
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
	}, [draft, snapshot, mutations, refetchGroups, queryClient]);

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
