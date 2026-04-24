import { useQueryClient } from 'react-query';
import { Trash2, X } from '@signozhq/icons';
import { Button, DialogWrapper, toast } from '@signozhq/ui';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	getListServiceAccountKeysQueryKey,
	invalidateListServiceAccountKeys,
	useRevokeServiceAccountKey,
} from 'api/generated/services/serviceaccount';
import type {
	RenderErrorResponseDTO,
	ServiceaccounttypesGettableFactorAPIKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { SA_QUERY_PARAMS } from 'container/ServiceAccountsSettings/constants';
import { parseAsString, useQueryState } from 'nuqs';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

export interface RevokeKeyContentProps {
	isRevoking: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

export function RevokeKeyContent({
	isRevoking,
	onCancel,
	onConfirm,
}: RevokeKeyContentProps): JSX.Element {
	return (
		<>
			<p className="delete-dialog__body">
				Revoking this key will permanently invalidate it. Any systems using this key
				will lose access immediately.
			</p>
			<div className="delete-dialog__footer">
				<Button variant="solid" color="secondary" size="sm" onClick={onCancel}>
					<X size={12} />
					Cancel
				</Button>
				<Button
					variant="solid"
					color="destructive"
					size="sm"
					loading={isRevoking}
					onClick={onConfirm}
				>
					<Trash2 size={12} />
					Revoke Key
				</Button>
			</div>
		</>
	);
}

function RevokeKeyModal(): JSX.Element {
	const queryClient = useQueryClient();
	const { showErrorModal, isErrorModalVisible } = useErrorModal();
	const [accountId] = useQueryState(SA_QUERY_PARAMS.ACCOUNT);
	const [revokeKeyId, setRevokeKeyId] = useQueryState(
		SA_QUERY_PARAMS.REVOKE_KEY,
		parseAsString.withDefault(''),
	);
	const open = !!revokeKeyId && !!accountId;

	const cachedKeys = accountId
		? queryClient.getQueryData<{
				data: ServiceaccounttypesGettableFactorAPIKeyDTO[];
			}>(getListServiceAccountKeysQueryKey({ id: accountId }))
		: null;
	const keyName = cachedKeys?.data?.find((k) => k.id === revokeKeyId)?.name;

	const { mutate: revokeKey, isLoading: isRevoking } =
		useRevokeServiceAccountKey({
			mutation: {
				onSuccess: async () => {
					toast.success('Key revoked successfully');
					await setRevokeKeyId(null);
					if (accountId) {
						await invalidateListServiceAccountKeys(queryClient, { id: accountId });
					}
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
		if (!revokeKeyId || !accountId) {
			return;
		}
		revokeKey({ pathParams: { id: accountId, fid: revokeKeyId } });
	}

	function handleCancel(): void {
		setRevokeKeyId(null);
	}

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					handleCancel();
				}
			}}
			title={`Revoke ${keyName ?? 'key'}?`}
			width="narrow"
			className="alert-dialog delete-dialog"
			showCloseButton={false}
			disableOutsideClick={isErrorModalVisible}
		>
			<RevokeKeyContent
				isRevoking={isRevoking}
				onCancel={handleCancel}
				onConfirm={handleConfirm}
			/>
		</DialogWrapper>
	);
}

export default RevokeKeyModal;
