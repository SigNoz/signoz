import { useCallback, useState } from 'react';
import { useQueryClient } from 'react-query';
import {
	invalidateGetRole,
	invalidateListRoles,
	useDeleteRole,
} from 'api/generated/services/role';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import APIError from 'types/api/error';

interface UseDeleteRoleModalProps {
	roleId?: string | null;
	isManaged: boolean;
	onDeleteSuccess?: () => void;
}

interface UseDeleteRoleModalResult {
	isDeleteModalOpen: boolean;
	isDeleteDisabled: boolean;
	deleteDisabledReason: string;
	isDeleting: boolean;
	deleteError: APIError | null;
	handleOpenDeleteModal: () => void;
	handleCloseDeleteModal: () => void;
	handleConfirmDelete: () => Promise<boolean>;
}

export function useDeleteRoleModal(
	props: UseDeleteRoleModalProps,
): UseDeleteRoleModalResult {
	const { roleId, isManaged, onDeleteSuccess } = props;
	const queryClient = useQueryClient();

	const [deleteTargetRoleId, setDeleteTargetRoleId] = useState<string | null>(
		null,
	);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<APIError | null>(null);

	const { mutateAsync: deleteRole } = useDeleteRole();

	const handleOpenDeleteModal = useCallback((): void => {
		setDeleteTargetRoleId(roleId ?? null);
	}, [roleId]);

	const handleCloseDeleteModal = useCallback((): void => {
		setDeleteTargetRoleId(null);
		setDeleteError(null);
	}, []);

	const handleConfirmDelete = useCallback(async (): Promise<boolean> => {
		if (!deleteTargetRoleId) {
			return false;
		}

		setIsDeleting(true);
		setDeleteError(null);

		try {
			await deleteRole({ pathParams: { id: deleteTargetRoleId } });
			await invalidateListRoles(queryClient);
			await invalidateGetRole(queryClient, { id: deleteTargetRoleId });
			setDeleteTargetRoleId(null);
			onDeleteSuccess?.();
			return true;
		} catch (error) {
			const apiError = convertToApiError(
				error as AxiosError<RenderErrorResponseDTO>,
			);
			setDeleteError(apiError ?? null);
			return false;
		} finally {
			setIsDeleting(false);
		}
	}, [deleteRole, deleteTargetRoleId, queryClient, onDeleteSuccess]);

	const isDeleteModalOpen = deleteTargetRoleId !== null;

	const isDeleteDisabled = isManaged;
	const deleteDisabledReason = 'Managed roles cannot be deleted';

	return {
		isDeleteModalOpen,
		isDeleteDisabled,
		deleteDisabledReason,
		isDeleting,
		deleteError,
		handleOpenDeleteModal,
		handleCloseDeleteModal,
		handleConfirmDelete,
	};
}
