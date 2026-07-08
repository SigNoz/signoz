import { useCallback, useEffect, useRef, useState } from 'react';
import { SpantypesSpanMapperDTO } from 'api/generated/services/sigNoz.schemas';
import { useListSpanMapperGroups } from 'api/generated/services/spanmapper';

import { DraftGroup } from '../../types';
import { buildDraftGroup, buildDraftMapper } from '../../utils';

export interface AttributeMappingStore {
	groups: DraftGroup[];
	isLoading: boolean;
	isError: boolean;
	toggleGroup: (localId: string, enabled: boolean) => void;
	hydrateGroupMappers: (
		groupServerId: string,
		mappers: SpantypesSpanMapperDTO[],
	) => void;
	toggleMapper: (
		groupLocalId: string,
		mapperLocalId: string,
		enabled: boolean,
	) => void;
}

// Draft store for the listing view: loads the server groups, holds them as a
// local working copy, and stages enabled/disabled flips against it. Each
// group's mappers are fetched lazily when its panel is expanded (see
// GroupMappers) and folded into the draft via hydrateGroupMappers, so page
// load is a single request instead of an N+1 fan-out across every group.
// Fuller editing (create/edit drawers, save/discard persistence) is layered
// on in a later PR.
export function useAttributeMappingStore(): AttributeMappingStore {
	const groupsQuery = useListSpanMapperGroups();
	const ready = !groupsQuery.isLoading;

	const [draft, setDraft] = useState<DraftGroup[] | null>(null);
	// Guards hydration to once per group: re-expanding a panel re-fires the
	// hydrate effect (react-query serves the cached list), and a second fold
	// would clobber toggles staged since the first one.
	const hydratedRef = useRef<Set<string>>(new Set());

	// Initialise the working copy once the groups arrive. Only runs while draft
	// is null, so it never clobbers staged edits.
	useEffect(() => {
		if (ready && draft === null) {
			const serverGroups = groupsQuery.data?.data?.items ?? [];
			// Mappers load lazily per group, so seed the tree with empty mappers.
			setDraft(serverGroups.map((group) => buildDraftGroup(group, [])));
		}
	}, [ready, draft, groupsQuery.data]);

	const toggleGroup = useCallback((localId: string, enabled: boolean): void => {
		setDraft((prev) =>
			(prev ?? []).map((group) =>
				group.localId === localId ? { ...group, enabled } : group,
			),
		);
	}, []);

	// Fold a group's freshly-fetched server mappers into the working draft,
	// exactly once per group (the guard skips re-expands).
	const hydrateGroupMappers = useCallback(
		(groupServerId: string, mappers: SpantypesSpanMapperDTO[]): void => {
			if (hydratedRef.current.has(groupServerId)) {
				return;
			}
			hydratedRef.current.add(groupServerId);
			setDraft((prev) =>
				prev === null
					? prev
					: prev.map((group) =>
							group.serverId === groupServerId
								? { ...group, mappers: mappers.map(buildDraftMapper) }
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

	return {
		groups: draft ?? [],
		isLoading: !ready || draft === null,
		isError: groupsQuery.isError,
		toggleGroup,
		hydrateGroupMappers,
		toggleMapper,
	};
}
