import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@signozhq/badge';
import { Button } from '@signozhq/button';
import { DialogWrapper } from '@signozhq/dialog';
import { ArrowUpRight, Check, Copy, Info } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { toast } from '@signozhq/sonner';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/toggle-group';
import { DatePicker } from 'antd';
import { useCreateServiceAccountKey } from 'api/generated/services/serviceaccount';
import type { ServiceaccounttypesGettableFactorAPIKeyWithKeyDTO } from 'api/generated/services/sigNoz.schemas';
import type { Dayjs } from 'dayjs';

import './AddKeyModal.styles.scss';

interface AddKeyModalProps {
	open: boolean;
	accountId: string;
	onClose: () => void;
	onSuccess: () => void;
}

type Phase = 'form' | 'created';
type ExpiryMode = 'none' | 'date';

function AddKeyModal({
	open,
	accountId,
	onClose,
	onSuccess,
}: AddKeyModalProps): JSX.Element {
	const [phase, setPhase] = useState<Phase>('form');
	const [keyName, setKeyName] = useState('');
	const [expiryMode, setExpiryMode] = useState<ExpiryMode>('none');
	const [expiryDate, setExpiryDate] = useState<Dayjs | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [
		createdKey,
		setCreatedKey,
	] = useState<ServiceaccounttypesGettableFactorAPIKeyWithKeyDTO | null>(null);
	const [hasCopied, setHasCopied] = useState(false);

	useEffect(() => {
		if (open) {
			setPhase('form');
			setKeyName('');
			setExpiryMode('none');
			setExpiryDate(null);
			setIsSubmitting(false);
			setCreatedKey(null);
			setHasCopied(false);
		}
	}, [open]);

	const { mutateAsync: createKey } = useCreateServiceAccountKey();

	const handleCreate = useCallback(async (): Promise<void> => {
		if (!keyName.trim()) {
			return;
		}
		setIsSubmitting(true);
		try {
			const expiresAt =
				expiryMode === 'date' && expiryDate ? expiryDate.unix() : 0;
			const response = await createKey({
				pathParams: { id: accountId },
				data: { name: keyName.trim(), expires_at: expiresAt },
			});
			const keyData = response?.data;
			if (keyData) {
				setCreatedKey(keyData);
				setPhase('created');
			}
		} catch {
			toast.error('Failed to create key', { richColors: true });
		} finally {
			setIsSubmitting(false);
		}
	}, [keyName, expiryMode, expiryDate, accountId, createKey]);

	const handleCopy = useCallback(async (): Promise<void> => {
		if (!createdKey?.key) {
			return;
		}
		try {
			await navigator.clipboard.writeText(createdKey.key);
			setHasCopied(true);
			setTimeout(() => setHasCopied(false), 2000);
			toast.success('Key copied to clipboard', { richColors: true });
		} catch {
			toast.error('Failed to copy key', { richColors: true });
		}
	}, [createdKey]);

	const handleClose = useCallback((): void => {
		if (phase === 'created') {
			onSuccess();
		}
		onClose();
	}, [phase, onSuccess, onClose]);

	const expiryLabel = (): string => {
		if (expiryMode === 'none' || !expiryDate) {
			return 'Never';
		}
		try {
			return expiryDate.format('MMM D, YYYY');
		} catch {
			return 'Never';
		}
	};

	const title = phase === 'form' ? 'Add a New Key' : 'Key Created Successfully';

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					handleClose();
				}
			}}
			title={title}
			width="base"
			className="add-key-modal"
			showCloseButton
			disableOutsideClick={false}
		>
			{phase === 'form' && (
				<div className="add-key-modal__form">
					<div className="add-key-modal__field">
						<label className="add-key-modal__label" htmlFor="key-name">
							Name <span style={{ color: 'var(--destructive)' }}>*</span>
						</label>
						<Input
							id="key-name"
							value={keyName}
							onChange={(e): void => setKeyName(e.target.value)}
							placeholder="Enter key name e.g.: Service Owner"
							className="add-key-modal__input"
						/>
					</div>

					<div className="add-key-modal__field">
						<span className="add-key-modal__label">Expiration</span>
						<ToggleGroup
							type="single"
							value={expiryMode}
							onValueChange={(val): void => {
								if (val) {
									setExpiryMode(val as ExpiryMode);
									if (val === 'none') {
										setExpiryDate(null);
									}
								}
							}}
							className="add-key-modal__expiry-toggle"
						>
							<ToggleGroupItem
								value="none"
								className="add-key-modal__expiry-toggle-btn"
							>
								No Expiration
							</ToggleGroupItem>
							<ToggleGroupItem
								value="date"
								className="add-key-modal__expiry-toggle-btn"
							>
								Set Expiration Date
							</ToggleGroupItem>
						</ToggleGroup>
					</div>

					{expiryMode === 'date' && (
						<div className="add-key-modal__field">
							<label className="add-key-modal__label" htmlFor="expiry-date">
								Expiration Date
							</label>
							<div className="add-key-modal__datepicker">
								<DatePicker
									id="expiry-date"
									value={expiryDate}
									onChange={(date): void => setExpiryDate(date)}
									style={{ width: '100%', height: 32 }}
									popupClassName="add-key-modal__datepicker-popup"
								/>
							</div>
						</div>
					)}

					<div className="add-key-modal__footer">
						<a
							href="https://signoz.io/docs/service-accounts"
							target="_blank"
							rel="noopener noreferrer"
							className="add-key-modal__learn-more"
						>
							Learn more about Service Account Keys
							<ArrowUpRight size={12} />
						</a>
						<div className="add-key-modal__footer-right">
							<Button
								variant="solid"
								color="secondary"
								size="sm"
								onClick={handleClose}
							>
								Cancel
							</Button>
							<Button
								variant="solid"
								color="primary"
								size="sm"
								disabled={!keyName.trim() || isSubmitting}
								onClick={handleCreate}
							>
								{isSubmitting ? 'Creating...' : 'Create Key'}
							</Button>
						</div>
					</div>
				</div>
			)}

			{phase === 'created' && createdKey && (
				<div className="add-key-modal__form">
					<div className="add-key-modal__field">
						<span className="add-key-modal__label">API Key</span>
						<div className="add-key-modal__key-display">
							<span className="add-key-modal__key-text">{createdKey.key}</span>
							<Button
								variant="outlined"
								color="secondary"
								size="sm"
								onClick={handleCopy}
								className="add-key-modal__copy-btn"
							>
								{hasCopied ? <Check size={12} /> : <Copy size={12} />}
							</Button>
						</div>
					</div>

					<div className="add-key-modal__expiry-meta">
						<span className="add-key-modal__expiry-label">Expiration</span>
						<Badge color="vanilla">{expiryLabel()}</Badge>
					</div>

					<div className="add-key-modal__callout">
						<Info size={12} className="add-key-modal__callout-icon" />
						<span>
							Store the key securely. This is the only time it will be displayed.
						</span>
					</div>

					<div className="add-key-modal__footer">
						<span />
						<div className="add-key-modal__footer-right">
							<Button variant="solid" color="primary" size="sm" onClick={handleClose}>
								Done
							</Button>
						</div>
					</div>
				</div>
			)}
		</DialogWrapper>
	);
}

export default AddKeyModal;
