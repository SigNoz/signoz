import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
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
import {
	invalidateListServiceAccountKeys,
	useCreateServiceAccountKey,
} from 'api/generated/services/serviceaccount';
import type {
	RenderErrorResponseDTO,
	ServiceaccounttypesGettableFactorAPIKeyWithKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import type { Dayjs } from 'dayjs';
import { parseAsBoolean, useQueryState } from 'nuqs';
import { popupContainer } from 'utils/selectPopupContainer';

import { disabledDate } from './utils';

import './AddKeyModal.styles.scss';

type Phase = 'form' | 'created';
type ExpiryMode = 'none' | 'date';

interface FormValues {
	keyName: string;
	expiryMode: ExpiryMode;
	expiryDate: Dayjs | null;
}

function AddKeyModal(): JSX.Element {
	const queryClient = useQueryClient();
	const [accountId] = useQueryState('account');
	const [isAddKeyOpen, setIsAddKeyOpen] = useQueryState(
		'add-key',
		parseAsBoolean.withDefault(false),
	);
	const open = isAddKeyOpen && !!accountId;

	const [phase, setPhase] = useState<Phase>('form');
	const [
		createdKey,
		setCreatedKey,
	] = useState<ServiceaccounttypesGettableFactorAPIKeyWithKeyDTO | null>(null);
	const [hasCopied, setHasCopied] = useState(false);

	const {
		control,
		register,
		handleSubmit,
		reset,
		watch,
		formState: { isValid },
	} = useForm<FormValues>({
		mode: 'onChange',
		defaultValues: { keyName: '', expiryMode: 'none', expiryDate: null },
	});

	const expiryMode = watch('expiryMode');
	const expiryDate = watch('expiryDate');

	useEffect(() => {
		if (open) {
			setPhase('form');
			setCreatedKey(null);
			setHasCopied(false);
			reset();
		}
	}, [open, reset]);

	const {
		mutate: createKey,
		isLoading: isSubmitting,
	} = useCreateServiceAccountKey({
		mutation: {
			onSuccess: (response) => {
				const keyData = response?.data;
				if (keyData) {
					setCreatedKey(keyData);
					setPhase('created');
					if (accountId) {
						void invalidateListServiceAccountKeys(queryClient, { id: accountId });
					}
				}
			},
			onError: (error) => {
				const errMessage =
					convertToApiError(
						error as AxiosError<RenderErrorResponseDTO, unknown> | null,
					)?.getErrorMessage() || 'Failed to create key';
				toast.error(errMessage, { richColors: true });
			},
		},
	});

	function handleCreate({
		keyName,
		expiryMode: mode,
		expiryDate: date,
	}: FormValues): void {
		if (!accountId) {
			return;
		}
		const expiresAt = mode === 'date' && date ? date.endOf('day').unix() : 0;
		createKey({
			pathParams: { id: accountId },
			data: { name: keyName.trim(), expiresAt },
		});
	}

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
		setIsAddKeyOpen(null);
	}, [setIsAddKeyOpen]);

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
								placeholder="Enter key name e.g.: Service Owner"
								className="add-key-modal__input"
								{...register('keyName', {
									required: true,
									validate: (v) => !!v.trim(),
								})}
							/>
						</div>

						<div className="add-key-modal__field">
							<span className="add-key-modal__label">Expiration</span>
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
								)}
							/>
						</div>

						{expiryMode === 'date' && (
							<div className="add-key-modal__field">
								<label className="add-key-modal__label" htmlFor="expiry-date">
									Expiration Date
								</label>
								<div className="add-key-modal__datepicker">
									<Controller
										name="expiryDate"
										control={control}
										render={({ field }): JSX.Element => (
											<DatePicker
												id="expiry-date"
												value={field.value}
												onChange={field.onChange}
												popupClassName="add-key-modal-datepicker-popup"
												getPopupContainer={popupContainer}
												disabledDate={disabledDate}
											/>
										)}
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
								loading={isSubmitting}
								disabled={!isValid}
								onClick={handleSubmit(handleCreate)}
							>
								Create Key
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
