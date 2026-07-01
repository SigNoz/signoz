import { useMemo } from 'react';
import { SpantypesSpanMapperGroupDTO } from 'api/generated/services/sigNoz.schemas';
import { useListSpanMapperGroups } from 'api/generated/services/spanmapper';

import { DraftGroup } from '../../types';
import { buildDraftGroup } from '../../utils';

export interface AttributeMappingStore {
	groups: DraftGroup[];
	isLoading: boolean;
	isError: boolean;
}

// Read-only store for the listing view: loads the server groups only. Each
// group's mappers are fetched lazily when its row is expanded (see
// MappersTable), so page load is a single request instead of an N+1 fan-out
// across every group. Editing (draft mutations, save/discard) is layered on in
// a later PR.
export function useAttributeMappingStore(): AttributeMappingStore {
	const groupsQuery = useListSpanMapperGroups();

	const groups = useMemo<DraftGroup[]>(() => {
		const serverGroups: SpantypesSpanMapperGroupDTO[] =
			groupsQuery.data?.data?.items ?? [];
		// Mappers load lazily per group, so seed the tree with empty mappers.
		return serverGroups.map((group) => buildDraftGroup(group, []));
	}, [groupsQuery.data]);

	return {
		groups,
		isLoading: groupsQuery.isLoading,
		isError: groupsQuery.isError,
	};
}
