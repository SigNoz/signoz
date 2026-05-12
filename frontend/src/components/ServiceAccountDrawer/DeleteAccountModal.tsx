import { useQueryClient } from 'react-query';
import { Trash2, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { toast } from '@signozhq/ui/sonner';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	getGetServiceAccountQueryKey,
	invalidateListServiceAccounts,
	useDeleteServiceAccount,
} from 'api/generated/services/serviceaccount';
import type {
	RenderErrorResponseDTO,
	ServiceaccounttypesServiceAccountDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { SA_QUERY_PARAMS } from 'container/ServiceAccountsSettings/constants';
import { parseAsBoolean, useQueryState } from 'nuqs';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

function DeleteAccountModal(): JSX.Element {
	const queryClient = useQueryClient();
	const { showErrorModal, isErrorModalVisible } = useErrorModal();
	const [accountId, setAccountId] = useQueryState(SA_QUERY_PARAMS.ACCOUNT);
	const [isDeleteOpen, setIsDeleteOpen] = useQueryState(
		SA_QUERY_PARAMS.DELETE_SA,
		parseAsBoolean.withDefault(false),
	);
	const open = !!isDeleteOpen && !!accountId;

	const cachedAccount = accountId
		? queryClient.getQueryData<{
				data: ServiceaccounttypesServiceAccountDTO;
			}>(getGetServiceAccountQueryKey({ id: accountId }))
		: null;
	const accountName = cachedAccount?.data?.name;

	const { mutate: deleteAccount, isLoading: isDeleting } =
		useDeleteServiceAccount({
			mutation: {
				onSuccess: async () => {
					toast.success('Service account deleted');
					await setIsDeleteOpen(null);
					await setAccountId(null);
					await invalidateListServiceAccounts(queryClient);
				},
				onError: (error) => {
					showErrorModal(
						convertToApiError(
							error as AxiosError<RenderErrorResponseDTO, unknown> | null,
						) as APIError,
					);
				},
			},
		});

	function handleConfirm(): void {
		if (!accountId) {
			return;
		}
		deleteAccount({
			pathParams: { id: accountId },
		});
	}

	function handleCancel(): void {
		setIsDeleteOpen(null);
	}

	const content = (
		<p className="sa-delete-dialog__body">
			Are you sure you want to delete <strong>{accountName}</strong>? This action
			cannot be undone. All keys associated with this service account will be
			permanently removed.
		</p>
	);

	const footer = (
		<div className="sa-delete-dialog__footer">
			<Button variant="solid" color="secondary" onClick={handleCancel}>
				<X size={12} />
				Cancel
			</Button>
			<Button
				variant="solid"
				color="destructive"
				loading={isDeleting}
				onClick={handleConfirm}
			>
				<Trash2 size={12} />
				Delete
			</Button>
		</div>
	);

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					handleCancel();
				}
			}}
			title={`Delete service account ${accountName ?? ''}?`}
			width="narrow"
			className="alert-dialog sa-delete-dialog"
			showCloseButton={false}
			disableOutsideClick={isErrorModalVisible}
			footer={footer}
		>
			{content}
		</DialogWrapper>
	);
}

export default DeleteAccountModal;
