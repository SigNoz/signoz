import { useMemo } from 'react';
import { useQueries } from 'react-query';
import {
	getListSpanMappersQueryOptions,
	useListSpanMapperGroups,
} from 'api/generated/services/spanmapper';

import { DraftGroup, Mapper, MapperGroup } from './types';
import { buildDraftGroup } from './utils';

export interface AttributeMappingStore {
	groups: DraftGroup[];
	isLoading: boolean;
	isError: boolean;
}

// Read-only store for the listing view: loads the server groups and their
// mappers and exposes them as a flat draft tree. Editing (draft mutations,
// save/discard) is layered on in a later PR.
export function useAttributeMappingStore(): AttributeMappingStore {
	const groupsQuery = useListSpanMapperGroups();
	const serverGroups: MapperGroup[] = useMemo(
		() => groupsQuery.data?.data?.items ?? [],
		[groupsQuery.data],
	);

	const mapperQueries = useQueries(
		serverGroups.map((group) =>
			getListSpanMappersQueryOptions({ groupId: group.id }),
		),
	);

	const mappersReady = mapperQueries.every((query) => !query.isLoading);
	const ready = !groupsQuery.isLoading && mappersReady;

	// Stable signature so the tree only rebuilds when server data changes.
	const dataSignature = useMemo(
		() =>
			JSON.stringify(serverGroups) +
			JSON.stringify(mapperQueries.map((query) => query.data?.data?.items ?? [])),
		[serverGroups, mapperQueries],
	);

	const groups = useMemo<DraftGroup[]>(() => {
		if (!ready) {
			return [];
		}
		return serverGroups.map((group, index) =>
			buildDraftGroup(
				group,
				(mapperQueries[index]?.data?.data?.items ?? []) as unknown as Mapper[],
			),
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ready, dataSignature]);

	return {
		groups,
		isLoading: !ready,
		isError: groupsQuery.isError,
	};
}
