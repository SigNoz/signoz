import { useCallback, useEffect, useMemo } from 'react';
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
import { MapperGroup } from '../types';
import { useAttributeMappingStore } from './useAttributeMappingStore';

const GROUPS_KEY_PREFIX = '/api/v1/span_mapper_groups';

interface AttributeMappingSync {
	save: () => Promise<void>;
}

// Bridges react-query (the fetch/mutation engine) and the zustand store (the
// working copy). Call this ONCE at the top of the feature: it mirrors the
// groups query into the store, exposes save(), and resets the store on unmount
// so the page-scoped draft never leaks across mounts.
export function useAttributeMappingSync(): AttributeMappingSync {
	const queryClient = useQueryClient();

	const groupsQuery = useListSpanMapperGroups();
	const { refetch: refetchGroups, isLoading, isError } = groupsQuery;
	const serverGroups = useMemo<MapperGroup[]>(
		() => groupsQuery.data?.data?.items ?? [],
		[groupsQuery.data],
	);
	const ready = !isLoading;

	const draft = useAttributeMappingStore((state) => state.draft);
	const serverSnapshot = useAttributeMappingStore(
		(state) => state.serverSnapshot,
	);
	const syncServer = useAttributeMappingStore((state) => state.syncServer);
	const seedFromServer = useAttributeMappingStore(
		(state) => state.seedFromServer,
	);
	const setSaving = useAttributeMappingStore((state) => state.setSaving);
	const setSaveError = useAttributeMappingStore((state) => state.setSaveError);
	const reset = useAttributeMappingStore((state) => state.reset);

	useEffect(() => {
		syncServer(serverGroups, ready, isError);
	}, [serverGroups, ready, isError, syncServer]);

	useEffect(() => (): void => reset(), [reset]);

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

	const save = useCallback(async (): Promise<void> => {
		if (!draft) {
			return;
		}
		setSaving(true);
		setSaveError(null);
		try {
			await persistDraft(serverSnapshot, draft, mutations);
			// Refresh the groups list in place — it stays mounted, so this just
			// swaps in fresh data without a loading flash.
			const result = await refetchGroups();
			if (result.isError) {
				toast.warning(
					'Changes saved, but the list failed to refresh. Reload to see the latest.',
				);
				return;
			}
			// Reseed the working copy from the fresh server groups (new ids
			// included) and drop the cached per-group mapper lists so expanded
			// groups refetch their mappers against the fresh server state.
			seedFromServer(result.data?.data?.items ?? []);
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
			setSaving(false);
		}
	}, [
		draft,
		serverSnapshot,
		mutations,
		refetchGroups,
		queryClient,
		seedFromServer,
		setSaving,
		setSaveError,
	]);

	return { save };
}
