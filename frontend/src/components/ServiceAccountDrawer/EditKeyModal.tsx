import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@signozhq/badge';
import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { LockKeyhole, Trash2, X } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { toast } from '@signozhq/sonner';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/toggle-group';
import { DatePicker } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
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
import { useTimezone } from 'providers/Timezone';
import { popupContainer } from 'utils/selectPopupContainer';

import { disabledDate, formatLastObservedAt } from './utils';

import './EditKeyModal.styles.scss';

interface EditKeyModalProps {
	open: boolean;
	accountId: string;
	keyItem: ServiceaccounttypesFactorAPIKeyDTO | null;
	onClose: () => void;
	onSuccess: () => void;
}

type ExpiryMode = 'none' | 'date';

// eslint-disable-next-line sonarjs/cognitive-complexity
function EditKeyModal({
	open,
	accountId,
	keyItem,
	onClose,
	onSuccess,
}: EditKeyModalProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const [localName, setLocalName] = useState('');
	const [expiryMode, setExpiryMode] = useState<ExpiryMode>('none');
	const [localDate, setLocalDate] = useState<Dayjs | null>(null);
	const [isRevokeConfirmOpen, setIsRevokeConfirmOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isRevoking, setIsRevoking] = useState(false);

	useEffect(() => {
		if (keyItem) {
			setLocalName(keyItem.name ?? '');
			if (keyItem.expiresAt === 0) {
				setExpiryMode('none');
				setLocalDate(null);
			} else {
				setExpiryMode('date');
				setLocalDate(dayjs.unix(keyItem.expiresAt));
			}
		}
	}, [keyItem]);

	const originalExpiresAt = keyItem?.expiresAt ?? 0;
	const currentExpiresAt =
		expiryMode === 'none' || !localDate ? 0 : localDate.endOf('day').unix();
	const isDirty =
		keyItem !== null &&
		(localName !== (keyItem.name ?? '') ||
			currentExpiresAt !== originalExpiresAt);

	const { mutateAsync: updateKey } = useUpdateServiceAccountKey();
	const { mutateAsync: revokeKey } = useRevokeServiceAccountKey();

	const handleSave = useCallback(async (): Promise<void> => {
		if (!keyItem || !isDirty) {
			return;
		}
		setIsSaving(true);
		try {
			await updateKey({
				pathParams: { id: accountId, fid: keyItem.id },
				data: { name: localName, expiresAt: currentExpiresAt },
			});
			toast.success('Key updated successfully', { richColors: true });
			onSuccess();
		} catch (error: unknown) {
			const errMessage =
				convertToApiError(
					error as AxiosError<RenderErrorResponseDTO, unknown> | null,
				)?.getErrorMessage() || 'Failed to update key';
			toast.error(errMessage, { richColors: true });
		} finally {
			setIsSaving(false);
		}
	}, [
		keyItem,
		isDirty,
		localName,
		currentExpiresAt,
		accountId,
		updateKey,
		onSuccess,
	]);

	const handleRevoke = useCallback(async (): Promise<void> => {
		if (!keyItem) {
			return;
		}
		setIsRevoking(true);
		try {
			await revokeKey({
				pathParams: { id: accountId, fid: keyItem.id },
			});
			toast.success('Key revoked successfully', { richColors: true });
			setIsRevokeConfirmOpen(false);
			onSuccess();
		} catch (error: unknown) {
			const errMessage =
				convertToApiError(
					error as AxiosError<RenderErrorResponseDTO, unknown> | null,
				)?.getErrorMessage() || 'Failed to revoke key';
			toast.error(errMessage, { richColors: true });
		} finally {
			setIsRevoking(false);
		}
	}, [keyItem, accountId, revokeKey, onSuccess]);

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					if (isRevokeConfirmOpen) {
						setIsRevokeConfirmOpen(false);
					} else {
						onClose();
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
				<>
					<p className="delete-dialog__body">
						Revoking this key will permanently invalidate it. Any systems using this
						key will lose access immediately.
					</p>
					<DialogFooter className="delete-dialog__footer">
						<Button
							variant="solid"
							color="secondary"
							size="sm"
							onClick={(): void => setIsRevokeConfirmOpen(false)}
						>
							<X size={12} />
							Cancel
						</Button>
						<Button
							variant="solid"
							color="destructive"
							size="sm"
							disabled={isRevoking}
							onClick={handleRevoke}
						>
							<Trash2 size={12} />
							{isRevoking ? 'Revoking...' : 'Revoke Key'}
						</Button>
					</DialogFooter>
				</>
			) : (
				<>
					<div className="edit-key-modal__form">
						<div className="edit-key-modal__field">
							<label className="edit-key-modal__label" htmlFor="edit-key-name">
								Name
							</label>
							<Input
								id="edit-key-name"
								value={localName}
								onChange={(e): void => setLocalName(e.target.value)}
								className="edit-key-modal__input"
								placeholder="Enter key name"
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
							<ToggleGroup
								type="single"
								value={expiryMode}
								onValueChange={(val): void => {
									if (val) {
										setExpiryMode(val as ExpiryMode);
										if (val === 'none') {
											setLocalDate(null);
										}
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
						</div>

						{expiryMode === 'date' && (
							<div className="edit-key-modal__field">
								<label className="edit-key-modal__label" htmlFor="edit-key-datepicker">
									Expiration Date
								</label>
								<div className="edit-key-modal__datepicker">
									<DatePicker
										value={localDate}
										id="edit-key-datepicker"
										onChange={(date): void => setLocalDate(date)}
										popupClassName="edit-key-modal-datepicker-popup"
										getPopupContainer={popupContainer}
										disabledDate={disabledDate}
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
							<Button variant="solid" color="secondary" size="sm" onClick={onClose}>
								<X size={12} />
								Cancel
							</Button>
							<Button
								variant="solid"
								color="primary"
								size="sm"
								disabled={!isDirty || isSaving}
								onClick={handleSave}
							>
								{isSaving ? 'Saving...' : 'Save Changes'}
							</Button>
						</div>
					</div>
				</>
			)}
		</DialogWrapper>
	);
}

export default EditKeyModal;
