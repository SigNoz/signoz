import { useCallback, useState } from 'react';
import { useQueryClient } from 'react-query';
import {
	getListSpanMappersQueryKey,
	useCreateSpanMapper,
	useDeleteSpanMapper,
	useUpdateSpanMapper,
} from 'api/generated/services/spanmapper';

import { Mapper, MapperDraft, MapperDraftMode } from './types';
import {
	buildPostableMapper,
	buildUpdatableMapper,
	draftFromMapper,
	EMPTY_MAPPER_DRAFT,
} from './utils';

interface UseMapperFormDrawerResult {
	isOpen: boolean;
	mode: MapperDraftMode;
	draft: MapperDraft;
	setDraft: (next: MapperDraft) => void;
	openForAdd: () => void;
	openForEdit: (mapper: Mapper) => void;
	close: () => void;
	save: () => Promise<void>;
	deleteMapper: () => Promise<void>;
	removeMapper: (mapperId: string) => Promise<void>;
	toggleEnabled: (mapper: Mapper, enabled: boolean) => Promise<void>;
	isSaving: boolean;
	isDeleting: boolean;
	saveError: string | null;
}

export function useMapperFormDrawer(
	groupId: string,
): UseMapperFormDrawerResult {
	const queryClient = useQueryClient();
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [mode, setMode] = useState<MapperDraftMode>('add');
	const [draft, setDraft] = useState<MapperDraft>(EMPTY_MAPPER_DRAFT);
	const [saveError, setSaveError] = useState<string | null>(null);

	const { mutateAsync: createMapper, isLoading: isCreating } =
		useCreateSpanMapper();
	const { mutateAsync: updateMapper, isLoading: isUpdating } =
		useUpdateSpanMapper();
	const { mutateAsync: deleteMapperApi, isLoading: isDeleting } =
		useDeleteSpanMapper();

	const invalidateList = useCallback(async (): Promise<void> => {
		await queryClient.invalidateQueries({
			queryKey: getListSpanMappersQueryKey({ groupId }),
		});
	}, [queryClient, groupId]);

	const openForAdd = useCallback((): void => {
		setMode('add');
		setDraft(EMPTY_MAPPER_DRAFT);
		setSaveError(null);
		setIsOpen(true);
	}, []);

	const openForEdit = useCallback((mapper: Mapper): void => {
		setMode('edit');
		setDraft(draftFromMapper(mapper));
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
				await updateMapper({
					pathParams: { groupId, mapperId: draft.id },
					data: buildUpdatableMapper(draft),
				});
			} else {
				await createMapper({
					pathParams: { groupId },
					data: buildPostableMapper(draft),
				});
			}
			await invalidateList();
			setIsOpen(false);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Save failed';
			setSaveError(message);
		}
	}, [mode, draft, groupId, updateMapper, createMapper, invalidateList]);

	// fieldContext is non-optional on the update DTO, so we resend the mapper's
	// current value to avoid clobbering it when only toggling enabled.
	const toggleEnabled = useCallback(
		async (mapper: Mapper, enabled: boolean): Promise<void> => {
			await updateMapper({
				pathParams: { groupId, mapperId: mapper.id },
				data: { fieldContext: mapper.fieldContext, enabled },
			});
			await invalidateList();
		},
		[groupId, updateMapper, invalidateList],
	);

	const removeMapper = useCallback(
		async (mapperId: string): Promise<void> => {
			await deleteMapperApi({ pathParams: { groupId, mapperId } });
			await invalidateList();
		},
		[groupId, deleteMapperApi, invalidateList],
	);

	const deleteMapper = useCallback(async (): Promise<void> => {
		if (!draft.id) {
			return;
		}
		setSaveError(null);
		try {
			await removeMapper(draft.id);
			setIsOpen(false);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Delete failed';
			setSaveError(message);
		}
	}, [draft.id, removeMapper]);

	return {
		isOpen,
		mode,
		draft,
		setDraft,
		openForAdd,
		openForEdit,
		close,
		save,
		deleteMapper,
		removeMapper,
		toggleEnabled,
		isSaving: isCreating || isUpdating,
		isDeleting,
		saveError,
	};
}
