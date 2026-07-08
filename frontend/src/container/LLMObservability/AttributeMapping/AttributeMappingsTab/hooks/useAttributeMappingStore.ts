import { useMemo } from 'react';
import { SpantypesSpanMapperGroupDTO } from 'api/generated/services/sigNoz.schemas';
import { useListSpanMapperGroups } from 'api/generated/services/spanmapper';

import { MappingGroup } from 'container/LLMObservability/AttributeMapping/types';
import { buildMappingGroup } from 'container/LLMObservability/AttributeMapping/utils';

export interface AttributeMappingStore {
	groups: MappingGroup[];
	isLoading: boolean;
	isError: boolean;
}

// Read-only store for the listing view: loads the server groups only. Each
// group's mappers are fetched lazily when its panel is expanded (see
// GroupMappers), so page load is a single request instead of an N+1 fan-out
// across every group. Editing (enabled toggles, save/discard) and its drawers
// land in a later PR — this PR only lists.
export function useAttributeMappingStore(): AttributeMappingStore {
	const groupsQuery = useListSpanMapperGroups();

	const groups = useMemo<MappingGroup[]>(() => {
		const serverGroups: SpantypesSpanMapperGroupDTO[] =
			groupsQuery.data?.data?.items ?? [];
		return serverGroups.map((group) => buildMappingGroup(group));
	}, [groupsQuery.data]);

	return {
		groups,
		isLoading: groupsQuery.isLoading,
		isError: groupsQuery.isError,
	};
}
