import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
import { DialogWrapper } from '@signozhq/dialog';
import { toast } from '@signozhq/ui';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	invalidateListServiceAccountKeys,
	useRevokeServiceAccountKey,
	useUpdateServiceAccountKey,
} from 'api/generated/services/serviceaccount';
import type {
	RenderErrorResponseDTO,
	ServiceaccounttypesGettableFactorAPIKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { SA_QUERY_PARAMS } from 'container/ServiceAccountsSettings/constants';
import dayjs from 'dayjs';
import { parseAsString, useQueryState } from 'nuqs';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useTimezone } from 'providers/Timezone';
import APIError from 'types/api/error';

import { RevokeKeyContent } from '../RevokeKeyModal';
import EditKeyForm from './EditKeyForm';
import type { FormValues } from './types';
import { DEFAULT_FORM_VALUES, ExpiryMode } from './types';

import './EditKeyModal.styles.scss';

export interface EditKeyModalProps {
	keyItem: ServiceaccounttypesGettableFactorAPIKeyDTO | null;
}

function EditKeyModal({ keyItem }: EditKeyModalProps): JSX.Element {
	const queryClient = useQueryClient();
	const [selectedAccountId] = useQueryState(SA_QUERY_PARAMS.ACCOUNT);
	const [editKeyId, setEditKeyId] = useQueryState(
		SA_QUERY_PARAMS.EDIT_KEY,
		parseAsString.withDefault(''),
	);

	const open = !!editKeyId && !!selectedAccountId;

	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const { showErrorModal, isErrorModalVisible } = useErrorModal();
	const [isRevokeConfirmOpen, setIsRevokeConfirmOpen] = useState(false);

	const {
		register,
		control,
		reset,
		watch,
		formState: { isDirty },
		handleSubmit,
	} = useForm<FormValues>({
		defaultValues: DEFAULT_FORM_VALUES,
	});

	useEffect(() => {
		if (keyItem) {
			reset({
				name: keyItem.name ?? '',
				expiryMode: keyItem.expiresAt === 0 ? ExpiryMode.NONE : ExpiryMode.DATE,
				expiresAt: keyItem.expiresAt === 0 ? null : dayjs.unix(keyItem.expiresAt),
			});
		}
	}, [keyItem?.id, reset]); // eslint-disable-line react-hooks/exhaustive-deps

	const expiryMode = watch('expiryMode');

	const { mutate: updateKey, isLoading: isSaving } = useUpdateServiceAccountKey({
		mutation: {
			onSuccess: async () => {
				toast.success('Key updated successfully', { richColors: true });
				await setEditKeyId(null);
				if (selectedAccountId) {
					await invalidateListServiceAccountKeys(queryClient, {
						id: selectedAccountId,
					});
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

	const {
		mutate: revokeKey,
		isLoading: isRevoking,
	} = useRevokeServiceAccountKey({
		mutation: {
			onSuccess: async () => {
				toast.success('Key revoked successfully', { richColors: true });
				setIsRevokeConfirmOpen(false);
				await setEditKeyId(null);
				if (selectedAccountId) {
					await invalidateListServiceAccountKeys(queryClient, {
						id: selectedAccountId,
					});
				}
			},
			// eslint-disable-next-line sonarjs/no-identical-functions
			onError: (error) => {
				showErrorModal(
					convertToApiError(
						error as AxiosError<RenderErrorResponseDTO, unknown> | null,
					) as APIError,
				);
			},
		},
	});

	function handleClose(): void {
		setEditKeyId(null);
		setIsRevokeConfirmOpen(false);
	}

	const onSubmit = handleSubmit(
		({ name, expiryMode: mode, expiresAt }): void => {
			if (!keyItem || !selectedAccountId) {
				return;
			}
			const currentExpiresAt =
				mode === ExpiryMode.NONE || !expiresAt ? 0 : expiresAt.endOf('day').unix();
			updateKey({
				pathParams: { id: selectedAccountId, fid: keyItem.id },
				data: { name, expiresAt: currentExpiresAt },
			});
		},
	);

	function handleRevoke(): void {
		if (!keyItem || !selectedAccountId) {
			return;
		}
		revokeKey({ pathParams: { id: selectedAccountId, fid: keyItem.id } });
	}

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					if (isRevokeConfirmOpen) {
						setIsRevokeConfirmOpen(false);
					} else {
						handleClose();
					}
				}
			}}
			title={
				isRevokeConfirmOpen
					? `Revoke ${keyItem?.name ?? 'key'}?`
					: 'Edit Key Details'
			}
			width={isRevokeConfirmOpen ? 'narrow' : 'base'}
			className={
				isRevokeConfirmOpen ? 'alert-dialog delete-dialog' : 'edit-key-modal'
			}
			showCloseButton={!isRevokeConfirmOpen}
			disableOutsideClick={isErrorModalVisible}
		>
			{isRevokeConfirmOpen ? (
				<RevokeKeyContent
					isRevoking={isRevoking}
					onCancel={(): void => setIsRevokeConfirmOpen(false)}
					onConfirm={handleRevoke}
				/>
			) : (
				<EditKeyForm
					register={register}
					control={control}
					expiryMode={expiryMode}
					keyItem={keyItem}
					isSaving={isSaving}
					isDirty={isDirty}
					onSubmit={onSubmit}
					onClose={handleClose}
					onRevokeClick={(): void => setIsRevokeConfirmOpen(true)}
					formatTimezoneAdjustedTimestamp={formatTimezoneAdjustedTimestamp}
				/>
			)}
		</DialogWrapper>
	);
}

export default EditKeyModal;
