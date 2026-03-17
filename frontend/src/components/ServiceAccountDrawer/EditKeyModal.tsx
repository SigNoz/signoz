import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
import { Badge } from '@signozhq/badge';
import { Button } from '@signozhq/button';
import { DialogWrapper } from '@signozhq/dialog';
import { LockKeyhole, Trash2, X } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { toast } from '@signozhq/sonner';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/toggle-group';
import { DatePicker } from 'antd';
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
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { parseAsString, useQueryState } from 'nuqs';
import { useTimezone } from 'providers/Timezone';
import { popupContainer } from 'utils/selectPopupContainer';

import { RevokeKeyContent } from './RevokeKeyModal';
import { disabledDate, formatLastObservedAt } from './utils';

import './EditKeyModal.styles.scss';

type ExpiryMode = 'none' | 'date';

interface FormValues {
	name: string;
	expiryMode: ExpiryMode;
	expiresAt: Dayjs | null;
}

interface EditKeyModalProps {
	keyItem: ServiceaccounttypesFactorAPIKeyDTO | null;
}

function EditKeyModal({ keyItem }: EditKeyModalProps): JSX.Element {
	const queryClient = useQueryClient();
	const [selectedAccountId] = useQueryState('account');
	const [editKeyId, setEditKeyId] = useQueryState(
		'edit-key',
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
		defaultValues: { name: '', expiryMode: 'none', expiresAt: null },
	});

	useEffect(() => {
		if (keyItem) {
			reset({
				name: keyItem.name ?? '',
				expiryMode: keyItem.expiresAt === 0 ? 'none' : 'date',
				expiresAt: keyItem.expiresAt === 0 ? null : dayjs.unix(keyItem.expiresAt),
			});
		}
	}, [keyItem?.id, reset]); // eslint-disable-line react-hooks/exhaustive-deps

	const expiryMode = watch('expiryMode');

	const { mutate: updateKey, isLoading: isSaving } = useUpdateServiceAccountKey({
		mutation: {
			onSuccess: () => {
				toast.success('Key updated successfully', { richColors: true });
				void setEditKeyId(null);
				if (selectedAccountId) {
					void invalidateListServiceAccountKeys(queryClient, {
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
			onSuccess: () => {
				toast.success('Key revoked successfully', { richColors: true });
				setIsRevokeConfirmOpen(false);
				void setEditKeyId(null);
				if (selectedAccountId) {
					void invalidateListServiceAccountKeys(queryClient, {
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
		void setEditKeyId(null);
		setIsRevokeConfirmOpen(false);
	}

	const onSubmit = handleSubmit(
		({ name, expiryMode: mode, expiresAt }): void => {
			if (!keyItem || !selectedAccountId) {
				return;
			}
			const currentExpiresAt =
				mode === 'none' || !expiresAt ? 0 : expiresAt.endOf('day').unix();
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
				<>
					<div className="edit-key-modal__form">
						<div className="edit-key-modal__field">
							<label className="edit-key-modal__label" htmlFor="edit-key-name">
								Name
							</label>
							<Input
								id="edit-key-name"
								className="edit-key-modal__input"
								placeholder="Enter key name"
								{...register('name')}
							/>
						</div>

						<div className="edit-key-modal__field">
							<label className="edit-key-modal__label" htmlFor="edit-key-display">
								Key
							</label>
							<div id="edit-key-display" className="edit-key-modal__key-display">
								<span className="edit-key-modal__key-text">********************</span>
								<LockKeyhole size={12} className="edit-key-modal__lock-icon" />
							</div>
						</div>

						<div className="edit-key-modal__field">
							<span className="edit-key-modal__label">Expiration</span>
							<Controller
								name="expiryMode"
								control={control}
								render={({ field }): JSX.Element => (
									<ToggleGroup
										type="single"
										value={field.value}
										onValueChange={(val): void => {
											if (val) {
												field.onChange(val);
											}
										}}
										className="edit-key-modal__expiry-toggle"
									>
										<ToggleGroupItem
											value="none"
											className="edit-key-modal__expiry-toggle-btn"
										>
											No Expiration
										</ToggleGroupItem>
										<ToggleGroupItem
											value="date"
											className="edit-key-modal__expiry-toggle-btn"
										>
											Set Expiration Date
										</ToggleGroupItem>
									</ToggleGroup>
								)}
							/>
						</div>

						{expiryMode === 'date' && (
							<div className="edit-key-modal__field">
								<label className="edit-key-modal__label" htmlFor="edit-key-datepicker">
									Expiration Date
								</label>
								<div className="edit-key-modal__datepicker">
									<Controller
										name="expiresAt"
										control={control}
										render={({ field }): JSX.Element => (
											<DatePicker
												value={field.value}
												id="edit-key-datepicker"
												onChange={field.onChange}
												popupClassName="edit-key-modal-datepicker-popup"
												getPopupContainer={popupContainer}
												disabledDate={disabledDate}
											/>
										)}
									/>
								</div>
							</div>
						)}

						<div className="edit-key-modal__meta">
							<span className="edit-key-modal__meta-label">Last Observed At</span>
							<Badge color="vanilla">
								{formatLastObservedAt(
									keyItem?.lastObservedAt ?? null,
									formatTimezoneAdjustedTimestamp,
								)}
							</Badge>
						</div>
					</div>

					<div className="edit-key-modal__footer">
						<Button
							type="button"
							className="edit-key-modal__footer-danger"
							onClick={(): void => setIsRevokeConfirmOpen(true)}
						>
							<Trash2 size={12} />
							Revoke Key
						</Button>
						<div className="edit-key-modal__footer-right">
							<Button
								variant="solid"
								color="secondary"
								size="sm"
								onClick={handleClose}
							>
								<X size={12} />
								Cancel
							</Button>
							<Button
								variant="solid"
								color="primary"
								size="sm"
								loading={isSaving}
								disabled={!isDirty}
								onClick={onSubmit}
							>
								Save Changes
							</Button>
						</div>
					</div>
				</>
			)}
		</DialogWrapper>
	);
}

export default EditKeyModal;
