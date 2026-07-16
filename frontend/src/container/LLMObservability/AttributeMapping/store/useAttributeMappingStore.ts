import { cloneDeep, isEqual } from 'lodash-es';
import { create } from 'zustand';

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

// Stable empty ref so `selectGroups` returns the same array while the draft is
// null — a fresh `[]` each call would break zustand's Object.is bail-out.
const EMPTY_GROUPS: DraftGroup[] = [];

function clone(groups: DraftGroup[]): DraftGroup[] {
	return cloneDeep(groups);
}

// The server baseline the working copy diffs against — server groups plus any
// lazily-loaded per-group mappers.
function buildSnapshot(
	serverGroups: MapperGroup[],
	loadedMappers: Record<string, Mapper[]>,
): DraftGroup[] {
	return serverGroups.map((group) =>
		buildDraftGroup(group, loadedMappers[group.id] ?? []),
	);
}

interface AttributeMappingServerState {
	serverGroups: MapperGroup[];
	serverSnapshot: DraftGroup[];
	serverReady: boolean;
	serverIsError: boolean;
	loadedMappers: Record<string, Mapper[]>;
	draft: DraftGroup[] | null;
	isSaving: boolean;
	saveError: string | null;
}

export interface AttributeMappingState extends AttributeMappingServerState {
	// Server sync — driven by the react-query orchestration hook.
	syncServer: (groups: MapperGroup[], ready: boolean, isError: boolean) => void;
	seedFromServer: (groups: MapperGroup[]) => void;
	setSaving: (saving: boolean) => void;
	setSaveError: (error: string | null) => void;
	reset: () => void;
	// Draft mutations.
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
	discard: () => void;
}

const initialServerState: AttributeMappingServerState = {
	serverGroups: [],
	serverSnapshot: [],
	serverReady: false,
	serverIsError: false,
	loadedMappers: {},
	draft: null,
	isSaving: false,
	saveError: null,
};

export const useAttributeMappingStore = create<AttributeMappingState>()(
	(set, get) => ({
		...initialServerState,

		// Mirrors the groups query into the store and seeds the working copy once
		// data is ready. Only seeds when the draft is null, so it never clobbers
		// in-flight edits (or the reseed done right after a save).
		syncServer: (groups, ready, isError): void =>
			set((state) => {
				const serverSnapshot = ready
					? buildSnapshot(groups, state.loadedMappers)
					: [];
				return {
					serverGroups: groups,
					serverReady: ready,
					serverIsError: isError,
					serverSnapshot,
					draft: ready && state.draft === null ? clone(serverSnapshot) : state.draft,
				};
			}),

		// Reseed from the post-save refetch: drop the lazily-loaded mappers so
		// expanded groups re-hydrate, and re-init the working copy from the fresh
		// server groups (new server ids included).
		seedFromServer: (groups): void =>
			set(() => {
				const serverSnapshot = buildSnapshot(groups, {});
				return {
					serverGroups: groups,
					serverSnapshot,
					loadedMappers: {},
					draft: clone(serverSnapshot),
				};
			}),

		setSaving: (saving): void => set({ isSaving: saving }),
		setSaveError: (error): void => set({ saveError: error }),
		reset: (): void => set(initialServerState),

		upsertGroup: (groupDraft): void =>
			set((state) => {
				const groups = state.draft ?? [];
				if (groupDraft.id) {
					return {
						draft: groups.map((group) =>
							group.localId === groupDraft.id
								? nodeFromGroupDraft(groupDraft, group)
								: group,
						),
					};
				}
				return { draft: [...groups, nodeFromGroupDraft(groupDraft)] };
			}),

		removeGroup: (localId): void =>
			set((state) => ({
				draft: (state.draft ?? []).filter((group) => group.localId !== localId),
			})),

		toggleGroup: (localId, enabled): void =>
			set((state) => ({
				draft: (state.draft ?? []).map((group) =>
					group.localId === localId ? { ...group, enabled } : group,
				),
			})),

		// Guarded by loadedMappers presence so a group's mappers hydrate once —
		// re-running would clobber unsaved mapper edits with the server list.
		hydrateGroupMappers: (groupServerId, mappers): void => {
			if (get().loadedMappers[groupServerId] !== undefined) {
				return;
			}
			set((state) => {
				const loadedMappers = {
					...state.loadedMappers,
					[groupServerId]: mappers,
				};
				return {
					loadedMappers,
					serverSnapshot: buildSnapshot(state.serverGroups, loadedMappers),
					draft:
						state.draft === null
							? state.draft
							: state.draft.map((group) =>
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
				};
			});
		},

		upsertMapper: (groupLocalId, mapperDraft): void =>
			set((state) => ({
				draft: (state.draft ?? []).map((group) => {
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
			})),

		removeMapper: (groupLocalId, mapperLocalId): void =>
			set((state) => ({
				draft: (state.draft ?? []).map((group) =>
					group.localId === groupLocalId
						? {
								...group,
								mappers: group.mappers.filter(
									(mapper) => mapper.localId !== mapperLocalId,
								),
							}
						: group,
				),
			})),

		toggleMapper: (groupLocalId, mapperLocalId, enabled): void =>
			set((state) => ({
				draft: (state.draft ?? []).map((group) =>
					group.localId === groupLocalId
						? {
								...group,
								mappers: group.mappers.map((mapper) =>
									mapper.localId === mapperLocalId ? { ...mapper, enabled } : mapper,
								),
							}
						: group,
				),
			})),

		discard: (): void =>
			set((state) => ({ saveError: null, draft: clone(state.serverSnapshot) })),
	}),
);

export const selectGroups = (state: AttributeMappingState): DraftGroup[] =>
	state.draft ?? EMPTY_GROUPS;

export const selectIsLoading = (state: AttributeMappingState): boolean =>
	!state.serverReady || state.draft === null;

export const selectIsError = (state: AttributeMappingState): boolean =>
	state.serverIsError;

export const selectIsDirty = (state: AttributeMappingState): boolean =>
	state.draft !== null && !isEqual(state.draft, state.serverSnapshot);
