import { useEffect, useState } from 'react';
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

import { RevokeKeyContent } from './RevokeKeyModal';
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

	const {
		mutate: updateKey,
		isLoading: isSaving,
	} = useUpdateServiceAccountKey();
	const {
		mutate: revokeKey,
		isLoading: isRevoking,
	} = useRevokeServiceAccountKey();

	function handleSave(): void {
		if (!keyItem || !isDirty) {
			return;
		}
		updateKey(
			{
				pathParams: { id: accountId, fid: keyItem.id },
				data: { name: localName, expiresAt: currentExpiresAt },
			},
			{
				onSuccess: () => {
					toast.success('Key updated successfully', { richColors: true });
					onSuccess();
				},
				onError: (error) => {
					const errMessage =
						convertToApiError(
							error as AxiosError<RenderErrorResponseDTO, unknown> | null,
						)?.getErrorMessage() || 'Failed to update key';
					toast.error(errMessage, { richColors: true });
				},
			},
		);
	}

	function handleRevoke(): void {
		if (!keyItem) {
			return;
		}
		revokeKey(
			{
				pathParams: { id: accountId, fid: keyItem.id },
			},
			{
				onSuccess: () => {
					toast.success('Key revoked successfully', { richColors: true });
					setIsRevokeConfirmOpen(false);
					onSuccess();
				},
				onError: (error) => {
					const errMessage =
						convertToApiError(
							error as AxiosError<RenderErrorResponseDTO, unknown> | null,
						)?.getErrorMessage() || 'Failed to revoke key';
					toast.error(errMessage, { richColors: true });
				},
			},
		);
	}

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
				<RevokeKeyContent
					keyName={keyItem?.name}
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
								loading={isSaving}
								disabled={!isDirty}
								onClick={handleSave}
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
