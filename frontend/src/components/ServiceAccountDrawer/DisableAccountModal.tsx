import { useQueryClient } from 'react-query';
import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { PowerOff, X } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	getGetServiceAccountQueryKey,
	invalidateListServiceAccounts,
	useUpdateServiceAccountStatus,
} from 'api/generated/services/serviceaccount';
import type {
	RenderErrorResponseDTO,
	ServiceaccounttypesServiceAccountDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { parseAsBoolean, useQueryState } from 'nuqs';

function DisableAccountModal(): JSX.Element {
	const queryClient = useQueryClient();
	const [accountId, setAccountId] = useQueryState('account');
	const [isDisableOpen, setIsDisableOpen] = useQueryState(
		'disable-sa',
		parseAsBoolean.withDefault(false),
	);
	const open = !!isDisableOpen && !!accountId;

	const cachedAccount = accountId
		? queryClient.getQueryData<{
				data: ServiceaccounttypesServiceAccountDTO;
		  }>(getGetServiceAccountQueryKey({ id: accountId }))
		: null;
	const accountName = cachedAccount?.data?.name;

	const {
		mutate: updateStatus,
		isLoading: isDisabling,
	} = useUpdateServiceAccountStatus({
		mutation: {
			onSuccess: () => {
				toast.success('Service account disabled', { richColors: true });
				void setIsDisableOpen(null);
				void setAccountId(null);
				void invalidateListServiceAccounts(queryClient);
			},
			onError: (error) => {
				const errMessage =
					convertToApiError(
						error as AxiosError<RenderErrorResponseDTO, unknown> | null,
					)?.getErrorMessage() || 'Failed to disable service account';
				toast.error(errMessage, { richColors: true });
			},
		},
	});

	function handleConfirm(): void {
		if (!accountId) {
			return;
		}
		updateStatus({
			pathParams: { id: accountId },
			data: { status: 'DISABLED' },
		});
	}

	function handleCancel(): void {
		void setIsDisableOpen(null);
	}

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					handleCancel();
				}
			}}
			title={`Disable service account ${accountName ?? ''}?`}
			width="narrow"
			className="alert-dialog sa-disable-dialog"
			showCloseButton={false}
			disableOutsideClick={false}
		>
			<p className="sa-disable-dialog__body">
				Disabling this service account will revoke access for all its keys. Any
				systems using this account will lose access immediately.
			</p>
			<DialogFooter className="sa-disable-dialog__footer">
				<Button variant="solid" color="secondary" size="sm" onClick={handleCancel}>
					<X size={12} />
					Cancel
				</Button>
				<Button
					variant="solid"
					color="destructive"
					size="sm"
					loading={isDisabling}
					onClick={handleConfirm}
				>
					<PowerOff size={12} />
					Disable
				</Button>
			</DialogFooter>
		</DialogWrapper>
	);
}

export default DisableAccountModal;
