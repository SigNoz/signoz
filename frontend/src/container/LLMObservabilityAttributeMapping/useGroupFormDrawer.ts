import { useCallback, useState } from 'react';
import { useQueryClient } from 'react-query';
import {
	getListSpanMapperGroupsQueryKey,
	useCreateSpanMapperGroup,
	useDeleteSpanMapperGroup,
	useUpdateSpanMapperGroup,
} from 'api/generated/services/spanmapper';

import { GroupDraft, MapperDraftMode, MapperGroup } from './types';
import {
	buildPostableGroup,
	buildUpdatableGroup,
	draftFromGroup,
	EMPTY_GROUP_DRAFT,
} from './utils';

interface UseGroupFormDrawerResult {
	isOpen: boolean;
	mode: MapperDraftMode;
	draft: GroupDraft;
	setDraft: (next: GroupDraft) => void;
	openForAdd: () => void;
	openForEdit: (group: MapperGroup) => void;
	close: () => void;
	save: () => Promise<void>;
	deleteGroup: () => Promise<void>;
	removeGroup: (groupId: string) => Promise<void>;
	toggleEnabled: (group: MapperGroup, enabled: boolean) => Promise<void>;
	isSaving: boolean;
	isDeleting: boolean;
	saveError: string | null;
}

export function useGroupFormDrawer(): UseGroupFormDrawerResult {
	const queryClient = useQueryClient();
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [mode, setMode] = useState<MapperDraftMode>('add');
	const [draft, setDraft] = useState<GroupDraft>(EMPTY_GROUP_DRAFT);
	const [saveError, setSaveError] = useState<string | null>(null);

	const { mutateAsync: createGroup, isLoading: isCreating } =
		useCreateSpanMapperGroup();
	const { mutateAsync: updateGroup, isLoading: isUpdating } =
		useUpdateSpanMapperGroup();
	const { mutateAsync: deleteGroupApi, isLoading: isDeleting } =
		useDeleteSpanMapperGroup();

	const invalidateList = useCallback(async (): Promise<void> => {
		await queryClient.invalidateQueries({
			queryKey: getListSpanMapperGroupsQueryKey(),
		});
	}, [queryClient]);

	const openForAdd = useCallback((): void => {
		setMode('add');
		setDraft(EMPTY_GROUP_DRAFT);
		setSaveError(null);
		setIsOpen(true);
	}, []);

	const openForEdit = useCallback((group: MapperGroup): void => {
		setMode('edit');
		setDraft(draftFromGroup(group));
		setSaveError(null);
		setIsOpen(true);
	}, []);

	const close = useCallback((): void => {
		setIsOpen(false);
		setSaveError(null);
	}, []);

	const save = useCallback(async (): Promise<void> => {
		setSaveError(null);
		try {
			if (mode === 'edit' && draft.id) {
				await updateGroup({
					pathParams: { groupId: draft.id },
					data: buildUpdatableGroup(draft),
				});
			} else {
				await createGroup({ data: buildPostableGroup(draft) });
			}
			await invalidateList();
			setIsOpen(false);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Save failed';
			setSaveError(message);
		}
	}, [mode, draft, updateGroup, createGroup, invalidateList]);

	const toggleEnabled = useCallback(
		async (group: MapperGroup, enabled: boolean): Promise<void> => {
			await updateGroup({
				pathParams: { groupId: group.id },
				data: { enabled },
			});
			await invalidateList();
		},
		[updateGroup, invalidateList],
	);

	const removeGroup = useCallback(
		async (groupId: string): Promise<void> => {
			await deleteGroupApi({ pathParams: { groupId } });
			await invalidateList();
		},
		[deleteGroupApi, invalidateList],
	);

	const deleteGroup = useCallback(async (): Promise<void> => {
		if (!draft.id) {
			return;
		}
		setSaveError(null);
		try {
			await removeGroup(draft.id);
			setIsOpen(false);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Delete failed';
			setSaveError(message);
		}
	}, [draft.id, removeGroup]);

	return {
		isOpen,
		mode,
		draft,
		setDraft,
		openForAdd,
		openForEdit,
		close,
		save,
		deleteGroup,
		removeGroup,
		toggleEnabled,
		isSaving: isCreating || isUpdating,
		isDeleting,
		saveError,
	};
}
