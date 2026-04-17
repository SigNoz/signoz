import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
import { useCopyToClipboard } from 'react-use';
import { DialogWrapper } from '@signozhq/dialog';
import { toast } from '@signozhq/ui';
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
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { SA_QUERY_PARAMS } from 'container/ServiceAccountsSettings/constants';
import { parseAsBoolean, useQueryState } from 'nuqs';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import KeyCreatedPhase from './KeyCreatedPhase';
import KeyFormPhase from './KeyFormPhase';
import type { FormValues } from './types';
import { DEFAULT_FORM_VALUES, ExpiryMode, Phase, PHASE_TITLES } from './types';

import './AddKeyModal.styles.scss';

function AddKeyModal(): JSX.Element {
	const queryClient = useQueryClient();
	const { showErrorModal, isErrorModalVisible } = useErrorModal();
	const [accountId] = useQueryState(SA_QUERY_PARAMS.ACCOUNT);
	const [isAddKeyOpen, setIsAddKeyOpen] = useQueryState(
		SA_QUERY_PARAMS.ADD_KEY,
		parseAsBoolean.withDefault(false),
	);
	const open = isAddKeyOpen && !!accountId;

	const [phase, setPhase] = useState<Phase>(Phase.FORM);
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
		defaultValues: DEFAULT_FORM_VALUES,
	});

	const expiryMode = watch('expiryMode');
	const expiryDate = watch('expiryDate');

	useEffect(() => {
		if (open) {
			setPhase(Phase.FORM);
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
			onSuccess: async (response) => {
				const keyData = response?.data;
				if (keyData) {
					setCreatedKey(keyData);
					setPhase(Phase.CREATED);
					if (accountId) {
						await invalidateListServiceAccountKeys(queryClient, { id: accountId });
					}
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

	function handleCreate({
		keyName,
		expiryMode: mode,
		expiryDate: date,
	}: FormValues): void {
		if (!accountId) {
			return;
		}
		const expiresAt =
			mode === ExpiryMode.DATE && date ? date.endOf('day').unix() : 0;
		createKey({
			pathParams: { id: accountId },
			data: { name: keyName.trim(), expiresAt },
		});
	}

	const [copyState, copyToClipboard] = useCopyToClipboard();
	const handleCopy = useCallback(async (): Promise<void> => {
		if (!createdKey?.key) {
			return;
		}

		copyToClipboard(createdKey.key);
		setHasCopied(true);
		setTimeout(() => setHasCopied(false), 2000);
		toast.success('Key copied to clipboard', { richColors: true });
	}, [copyToClipboard, createdKey?.key]);

	useEffect(() => {
		if (copyState.error) {
			toast.error('Failed to copy key', { richColors: true });
		}
	}, [copyState.error]);

	const handleClose = useCallback((): void => {
		setIsAddKeyOpen(null);
	}, [setIsAddKeyOpen]);

	function getExpiryLabel(): string {
		if (expiryMode === ExpiryMode.NONE || !expiryDate) {
			return 'Never';
		}
		try {
			return expiryDate.format(DATE_TIME_FORMATS.MONTH_DATE);
		} catch {
			return 'Never';
		}
	}

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					handleClose();
				}
			}}
			title={PHASE_TITLES[phase]}
			width="base"
			className="add-key-modal"
			showCloseButton
			disableOutsideClick={isErrorModalVisible}
		>
			{phase === Phase.FORM && (
				<KeyFormPhase
					register={register}
					control={control}
					expiryMode={expiryMode}
					isSubmitting={isSubmitting}
					isValid={isValid}
					onSubmit={handleSubmit(handleCreate)}
					onClose={handleClose}
				/>
			)}

			{phase === Phase.CREATED && createdKey && (
				<KeyCreatedPhase
					createdKey={createdKey}
					hasCopied={hasCopied}
					expiryLabel={getExpiryLabel()}
					onCopy={handleCopy}
				/>
			)}
		</DialogWrapper>
	);
}

export default AddKeyModal;
