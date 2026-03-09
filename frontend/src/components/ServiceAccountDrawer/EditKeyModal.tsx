import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@signozhq/badge';
import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { LockKeyhole, Trash2, X } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { toast } from '@signozhq/sonner';
import { DatePicker, Modal } from 'antd';
import {
	useRevokeServiceAccountKey,
	useUpdateServiceAccountKey,
} from 'api/generated/services/serviceaccount';
import type { ServiceaccounttypesFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useTimezone } from 'providers/Timezone';

import { formatLastUsed } from './utils';

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
			if (keyItem.expires_at === 0) {
				setExpiryMode('none');
				setLocalDate(null);
			} else {
				setExpiryMode('date');
				setLocalDate(dayjs.unix(keyItem.expires_at));
			}
		}
	}, [keyItem]);

	const originalExpiresAt = keyItem?.expires_at ?? 0;
	const currentExpiresAt =
		expiryMode === 'none' || !localDate ? 0 : localDate.unix();
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
				data: { name: localName, expires_at: currentExpiresAt },
			});
			toast.success('Key updated successfully', { richColors: true });
			onSuccess();
		} catch {
			toast.error('Failed to update key', { richColors: true });
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
		} catch {
			toast.error('Failed to revoke key', { richColors: true });
		} finally {
			setIsRevoking(false);
		}
	}, [keyItem, accountId, revokeKey, onSuccess]);

	const handleFormatLastUsed = useCallback(
		(lastUsed: Date | null | undefined): string =>
			formatLastUsed(lastUsed, formatTimezoneAdjustedTimestamp),
		[formatTimezoneAdjustedTimestamp],
	);

	const expiryDisplayLabel = (): string => {
		if (expiryMode === 'none' || !localDate) {
			return 'Never';
		}
		try {
			return localDate.format('MMM D, YYYY');
		} catch {
			return 'Never';
		}
	};

	return (
		<>
			<Modal
				open={open}
				onCancel={onClose}
				title="Edit Key"
				width={530}
				footer={null}
				className="edit-key-modal"
				destroyOnClose
			>
				<div className="edit-key-modal__form">
					{/* Name */}
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

					{/* Key (read-only masked) */}
					<div className="edit-key-modal__field">
						<label className="edit-key-modal__label" htmlFor="edit-key-display">
							Key
						</label>
						<div id="edit-key-display" className="edit-key-modal__key-display">
							<span className="edit-key-modal__key-text">{keyItem?.key ?? '—'}</span>
							<LockKeyhole size={12} className="edit-key-modal__lock-icon" />
						</div>
					</div>

					{/* Expiration toggle */}
					<div className="edit-key-modal__field">
						<label className="edit-key-modal__label" htmlFor="edit-key-expiry-toggle">
							Expiration
						</label>
						<div
							id="edit-key-expiry-toggle"
							className="edit-key-modal__expiry-toggle"
						>
							<Button
								variant={expiryMode === 'none' ? 'solid' : 'ghost'}
								color="secondary"
								size="sm"
								className={`edit-key-modal__expiry-toggle-btn${
									expiryMode === 'none'
										? ' edit-key-modal__expiry-toggle-btn--active'
										: ''
								}`}
								onClick={(): void => {
									setExpiryMode('none');
									setLocalDate(null);
								}}
							>
								No Expiration
							</Button>
							<Button
								variant={expiryMode === 'date' ? 'solid' : 'ghost'}
								color="secondary"
								size="sm"
								className={`edit-key-modal__expiry-toggle-btn${
									expiryMode === 'date'
										? ' edit-key-modal__expiry-toggle-btn--active'
										: ''
								}`}
								onClick={(): void => setExpiryMode('date')}
							>
								Set Expiration Date
							</Button>
						</div>
					</div>

					{expiryMode === 'date' && (
						<div className="edit-key-modal__field">
							<label className="edit-key-modal__label" htmlFor="edit-key-datepicker">
								Expiration Date
							</label>
							<div id="edit-key-datepicker" className="edit-key-modal__datepicker">
								<DatePicker
									value={localDate}
									onChange={(date): void => setLocalDate(date)}
									style={{ width: '100%', height: 32 }}
								/>
							</div>
						</div>
					)}

					{/* Expiry meta */}
					<div className="edit-key-modal__meta">
						<span className="edit-key-modal__meta-label">Expiry</span>
						<Badge color="vanilla">{expiryDisplayLabel()}</Badge>
					</div>

					{/* Last used meta */}
					<div className="edit-key-modal__meta">
						<span className="edit-key-modal__meta-label">Last Used</span>
						<Badge color="vanilla">
							{handleFormatLastUsed(keyItem?.last_used ?? null)}
						</Badge>
					</div>

					{/* Footer */}
					<div className="edit-key-modal__footer">
						<button
							type="button"
							className="edit-key-modal__footer-danger"
							onClick={(): void => setIsRevokeConfirmOpen(true)}
						>
							<Trash2 size={12} />
							Revoke Key
						</button>
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
				</div>
			</Modal>

			{/* Revoke confirm dialog */}
			<DialogWrapper
				open={isRevokeConfirmOpen}
				onOpenChange={(isOpen): void => {
					if (!isOpen) {
						setIsRevokeConfirmOpen(false);
					}
				}}
				title={`Revoke ${keyItem?.name ?? 'key'}?`}
				width="narrow"
				className="alert-dialog delete-dialog"
				showCloseButton={false}
				disableOutsideClick={false}
			>
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
			</DialogWrapper>
		</>
	);
}

export default EditKeyModal;
