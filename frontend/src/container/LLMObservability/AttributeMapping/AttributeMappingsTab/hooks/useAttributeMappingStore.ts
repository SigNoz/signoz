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
// group's mappers are fetched lazily when its panel is expanded (see
// GroupMappers), so page load is a single request instead of an N+1 fan-out
// across every group. The editable draft (enabled toggles, save/discard) and
// the drawers that consume it land in a later PR — this PR only lists.
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
