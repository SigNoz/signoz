import { useQueryClient } from 'react-query';
import { Trash2, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { buildSADeletePermission } from 'lib/authz/hooks/useAuthZ/permissions/service-account.permissions';
import { Dialog } from '@signozhq/ui/dialog';
import { toast } from '@signozhq/ui/toast';
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
	const { showErrorModal } = useErrorModal();
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
		void setIsDeleteOpen(null);
	}

	const content = (
		<div className="sa-delete-dialog__body">
			Are you sure you want to delete <strong>{accountName}</strong>? This action
			cannot be undone. All keys associated with this service account will be
			permanently removed.
		</div>
	);

	const footer = (
		<>
			<Button
				size="md"
				variant="solid"
				color="secondary"
				onClick={handleCancel}
				prefix={<X size={12} />}
			>
				Cancel
			</Button>
			<AuthZButton
				size="md"
				checks={[buildSADeletePermission(accountId ?? '')]}
				authZEnabled={!!accountId}
				variant="solid"
				color="danger"
				loading={isDeleting}
				onClick={handleConfirm}
				data-testid="confirm-delete-btn"
				prefix={<Trash2 size={12} />}
			>
				Delete
			</AuthZButton>
		</>
	);

	return (
		<Dialog
			open={open}
			onClose={handleCancel}
			title={`Delete service account ${accountName ?? ''}?`}
			width="narrow"
			testId="delete-service-account-modal"
			footerSuffix={footer}
		>
			{content}
		</Dialog>
	);
}

export default DeleteAccountModal;
