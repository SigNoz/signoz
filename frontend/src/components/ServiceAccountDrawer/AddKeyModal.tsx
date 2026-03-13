import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@signozhq/badge';
import { Button } from '@signozhq/button';
import { Callout } from '@signozhq/callout';
import { DialogWrapper } from '@signozhq/dialog';
import { Check, Copy } from '@signozhq/icons';
import { Input } from '@signozhq/input';
import { toast } from '@signozhq/sonner';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/toggle-group';
import { DatePicker } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { useCreateServiceAccountKey } from 'api/generated/services/serviceaccount';
import type {
	RenderErrorResponseDTO,
	ServiceaccounttypesGettableFactorAPIKeyWithKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import type { Dayjs } from 'dayjs';
import { popupContainer } from 'utils/selectPopupContainer';

import { disabledDate } from './utils';

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
				expiryMode === 'date' && expiryDate ? expiryDate.endOf('day').unix() : 0;
			const response = await createKey({
				pathParams: { id: accountId },
				data: { name: keyName.trim(), expiresAt },
			});
			const keyData = response?.data;
			if (keyData) {
				setCreatedKey(keyData);
				setPhase('created');
			}
		} catch (error: unknown) {
			const errMessage =
				convertToApiError(
					error as AxiosError<RenderErrorResponseDTO, unknown> | null,
				)?.getErrorMessage() || 'Failed to create key';
			toast.error(errMessage, { richColors: true });
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
				<>
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
										popupClassName="add-key-modal-datepicker-popup"
										getPopupContainer={popupContainer}
										disabledDate={disabledDate}
									/>
								</div>
							</div>
						)}
					</div>

					<div className="add-key-modal__footer">
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
				</>
			)}

			{phase === 'created' && createdKey && (
				<>
					<div className="add-key-modal__form">
						<div className="add-key-modal__field">
							<span className="add-key-modal__label">Key</span>
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

						<Callout
							type="info"
							showIcon
							message="Store the key securely. This is the only time it will be displayed."
						/>
					</div>
				</>
			)}
		</DialogWrapper>
	);
}

export default AddKeyModal;
