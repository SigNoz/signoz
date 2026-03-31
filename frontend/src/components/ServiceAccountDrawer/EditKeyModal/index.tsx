import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
import { DialogWrapper } from '@signozhq/dialog';
import { toast } from '@signozhq/sonner';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	invalidateListServiceAccountKeys,
	useRevokeServiceAccountKey,
	useUpdateServiceAccountKey,
} from 'api/generated/services/serviceaccount';
import type {
	RenderErrorResponseDTO,
	ServiceaccounttypesFactorAPIKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { SA_QUERY_PARAMS } from 'container/ServiceAccountsSettings/constants';
import dayjs from 'dayjs';
import { parseAsString, useQueryState } from 'nuqs';
import { useTimezone } from 'providers/Timezone';

import { RevokeKeyContent } from '../RevokeKeyModal';
import EditKeyForm from './EditKeyForm';
import type { FormValues } from './types';
import { DEFAULT_FORM_VALUES, ExpiryMode } from './types';

import './EditKeyModal.styles.scss';

export interface EditKeyModalProps {
	keyItem: ServiceaccounttypesFactorAPIKeyDTO | null;
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
				const errMessage =
					convertToApiError(
						error as AxiosError<RenderErrorResponseDTO, unknown> | null,
					)?.getErrorMessage() || 'Failed to update key';
				toast.error(errMessage, { richColors: true });
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
			onError: (error) => {
				const errMessage =
					convertToApiError(
						error as AxiosError<RenderErrorResponseDTO, unknown> | null,
					)?.getErrorMessage() || 'Failed to revoke key';
				toast.error(errMessage, { richColors: true });
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
			disableOutsideClick={false}
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
