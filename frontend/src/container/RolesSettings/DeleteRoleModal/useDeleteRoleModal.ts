import { useCallback, useState } from 'react';
import { useQueryClient } from 'react-query';
import {
	invalidateGetRole,
	invalidateListRoles,
	useDeleteRole,
} from 'api/generated/services/role';

interface UseDeleteRoleModalProps {
	roleId?: string | null;
	isManaged: boolean;
	hasDeletePermission: boolean;
	onDeleteSuccess?: () => void;
}

interface UseDeleteRoleModalResult {
	isDeleteModalOpen: boolean;
	isDeleteDisabled: boolean;
	deleteDisabledReason: string;
	isDeleting: boolean;
	deleteErrorMessage: string | null;
	handleOpenDeleteModal: () => void;
	handleCloseDeleteModal: () => void;
	handleConfirmDelete: () => Promise<boolean>;
}

export function useDeleteRoleModal(
	props: UseDeleteRoleModalProps,
): UseDeleteRoleModalResult {
	const { roleId, isManaged, hasDeletePermission, onDeleteSuccess } = props;
	const queryClient = useQueryClient();

	const [deleteTargetRoleId, setDeleteTargetRoleId] = useState<string | null>(
		null,
	);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
		null,
	);

	const { mutateAsync: deleteRole } = useDeleteRole();

	const handleOpenDeleteModal = useCallback((): void => {
		setDeleteTargetRoleId(roleId ?? null);
	}, [roleId]);

	const handleCloseDeleteModal = useCallback((): void => {
		setDeleteTargetRoleId(null);
		setDeleteErrorMessage(null);
	}, []);

	const handleConfirmDelete = useCallback(async (): Promise<boolean> => {
		if (!deleteTargetRoleId) {
			return false;
		}

		setIsDeleting(true);
		setDeleteErrorMessage(null);

		try {
			await deleteRole({ pathParams: { id: deleteTargetRoleId } });
			await invalidateListRoles(queryClient);
			await invalidateGetRole(queryClient, { id: deleteTargetRoleId });
			setDeleteTargetRoleId(null);
			onDeleteSuccess?.();
			return true;
		} catch (error) {
			const axiosError = error as {
				response?: { data?: { error?: { message?: unknown } } };
			};
			const message =
				axiosError?.response?.data?.error?.message ||
				(error instanceof Error ? error.message : null) ||
				'Failed to delete role';
			setDeleteErrorMessage(String(message));
			return false;
		} finally {
			setIsDeleting(false);
		}
	}, [deleteRole, deleteTargetRoleId, queryClient, onDeleteSuccess]);

	const isDeleteModalOpen = deleteTargetRoleId !== null;

	const isDeleteDisabled = isManaged || !hasDeletePermission;
	const deleteDisabledReason = isManaged
		? 'Managed roles cannot be deleted'
		: 'You do not have permission to delete this role';

	return {
		isDeleteModalOpen,
		isDeleteDisabled,
		deleteDisabledReason,
		isDeleting,
		deleteErrorMessage,
		handleOpenDeleteModal,
		handleCloseDeleteModal,
		handleConfirmDelete,
	};
}
