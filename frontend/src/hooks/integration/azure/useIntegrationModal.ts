import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui';
import { Form, FormInstance } from 'antd';
import {
	CreateAccountMutationResult,
	GetConnectionCredentialsQueryResult,
	invalidateListAccounts,
	useCreateAccount,
	useGetConnectionCredentials,
} from 'api/generated/services/cloudintegration';
import {
	CloudintegrationtypesCredentialsDTO,
	CloudintegrationtypesPostableAccountDTO,
} from 'api/generated/services/sigNoz.schemas';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { ModalStateEnum } from 'container/Integrations/HeroSection/types';
import useAxiosError from 'hooks/useAxiosError';

import logEvent from '../../../api/common/logEvent';

interface UseIntegrationModalProps {
	onClose: () => void;
}

interface UseAzureIntegrationModal {
	form: FormInstance;
	modalState: ModalStateEnum;
	isLoading: boolean;
	accountId?: string;
	connectionCommands: {
		cliCommand: string;
		cloudPowerShellCommand: string;
	} | null;
	setModalState: Dispatch<SetStateAction<ModalStateEnum>>;
	handleSubmit: () => Promise<void>;
	handleClose: () => void;
	connectionParams?: CloudintegrationtypesCredentialsDTO;
	isConnectionParamsLoading: boolean;
	handleConnectionSuccess: (payload: {
		cloudAccountId: string;
		status?: unknown;
	}) => void;
	handleConnectionTimeout: (payload: { id?: string }) => void;
	handleConnectionError: () => void;
}

export function useIntegrationModal({
	onClose,
}: UseIntegrationModalProps): UseAzureIntegrationModal {
	const queryClient = useQueryClient();
	const [form] = Form.useForm();
	const [modalState, setModalState] = useState<ModalStateEnum>(
		ModalStateEnum.FORM,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [accountId, setAccountId] = useState<string | undefined>(undefined);
	const [connectionCommands, setConnectionCommands] = useState<{
		cliCommand: string;
		cloudPowerShellCommand: string;
	} | null>(null);

	const handleClose = useCallback((): void => {
		setModalState(ModalStateEnum.FORM);
		setConnectionCommands(null);
		onClose();
	}, [onClose]);

	const handleConnectionSuccess = useCallback(
		(payload: { cloudAccountId: string; status?: unknown }): void => {
			logEvent('Azure Integration: Account connected', {
				cloudAccountId: payload.cloudAccountId,
				status: payload.status,
			});
			toast.success('Azure account connected successfully', {
				position: 'bottom-right',
			});
			void invalidateListAccounts(queryClient, {
				cloudProvider: INTEGRATION_TYPES.AZURE,
			});
			handleClose();
		},
		[handleClose, queryClient],
	);

	const handleConnectionTimeout = useCallback(
		(payload: { id?: string }): void => {
			setModalState(ModalStateEnum.ERROR);
			logEvent('Azure Integration: Account connection attempt timed out', {
				id: payload.id,
			});
		},
		[],
	);

	const handleConnectionError = useCallback((): void => {
		setModalState(ModalStateEnum.ERROR);
	}, []);

	const { mutate: createAccount } = useCreateAccount();
	const handleError = useAxiosError();

	const { data: connectionParams, isLoading: isConnectionParamsLoading } =
		useGetConnectionCredentials<GetConnectionCredentialsQueryResult>(
			{
				cloudProvider: INTEGRATION_TYPES.AZURE,
			},
			{
				query: {
					onError: handleError,
				},
			},
		);

	const handleSubmit = useCallback(async (): Promise<void> => {
		try {
			setIsLoading(true);
			const values = await form.validateFields();

			const payload: CloudintegrationtypesPostableAccountDTO = {
				config: {
					azure: {
						deploymentRegion: values.region,
						resourceGroups: values.resourceGroups || [],
					},
				},
				credentials: {
					ingestionUrl: connectionParams?.data?.ingestionUrl || values.ingestionUrl,
					ingestionKey: connectionParams?.data?.ingestionKey || values.ingestionKey,
					sigNozApiUrl: connectionParams?.data?.sigNozApiUrl || values.sigNozApiUrl,
					sigNozApiKey: connectionParams?.data?.sigNozApiKey || values.sigNozApiKey,
				},
			};

			createAccount(
				{
					pathParams: { cloudProvider: INTEGRATION_TYPES.AZURE },
					data: payload,
				},
				{
					onSuccess: (response: CreateAccountMutationResult) => {
						const nextAccountId = response.data.id;
						const artifact = response.data.connectionArtifact.azure;

						logEvent('Azure Integration: Account connection commands generated', {
							id: nextAccountId,
						});

						setConnectionCommands({
							cliCommand: artifact?.cliCommand || '',
							cloudPowerShellCommand: artifact?.cloudPowerShellCommand || '',
						});
						setModalState(ModalStateEnum.WAITING);
						setAccountId(nextAccountId);
					},
					onError: () => {
						setModalState(ModalStateEnum.ERROR);
						toast.error('Failed to create account connection', {
							position: 'bottom-right',
						});
					},
				},
			);
		} catch (error) {
			console.error('Form submission failed:', error);
		} finally {
			setIsLoading(false);
		}
	}, [form, connectionParams, createAccount]);

	return {
		form,
		modalState,
		isLoading,
		accountId,
		connectionCommands,
		setModalState,
		handleSubmit,
		handleClose,
		connectionParams: connectionParams?.data as
			| CloudintegrationtypesCredentialsDTO
			| undefined,
		isConnectionParamsLoading,
		handleConnectionSuccess,
		handleConnectionTimeout,
		handleConnectionError,
	};
}
