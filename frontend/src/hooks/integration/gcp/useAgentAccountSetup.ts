import { useCallback, useState } from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import {
	GetConnectionCredentialsQueryResult,
	invalidateListAccounts,
	useCreateAccount,
	useGetConnectionCredentials,
} from 'api/generated/services/cloudintegration';
import {
	CloudintegrationtypesAccountDTO,
	CloudintegrationtypesCredentialsDTO,
	CloudintegrationtypesGCPConnectionMethodDTO,
	CloudintegrationtypesPostableAccountDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ErrorType } from 'api/generatedAPIInstance';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { GcpSetupFormValues } from 'container/Integrations/CloudIntegration/GoogleCloudPlatform/AddNewAccount/types';
import { ModalStateEnum } from 'container/Integrations/HeroSection/types';
import useAxiosError from 'hooks/useAxiosError';
import { toAPIError } from 'utils/errorUtils';

import logEvent from '../../../api/common/logEvent';
import { useAgentConnectionPolling } from './useAgentConnectionPolling';

const GENERATE_COMMAND_ERROR = 'Failed to generate the GCP setup command';

interface UseAgentAccountSetupProps {
	onClose: () => void;
	onCommandGenerated: () => void;
}

interface UseAgentAccountSetup {
	isLoading: boolean;
	generateCommand: (values: GcpSetupFormValues) => Promise<void>;
	connectionParams?: CloudintegrationtypesCredentialsDTO;
	isConnectionParamsLoading: boolean;
	submitError: string | null;
	clearSubmitError: () => void;
	connectionCommand: string | null;
	/** The project the generated command targets, as submitted. */
	commandProjectId: string;
	modalState: ModalStateEnum;
	checkConnectionAgain: () => void;
}

export function useAgentAccountSetup({
	onClose,
	onCommandGenerated,
}: UseAgentAccountSetupProps): UseAgentAccountSetup {
	const queryClient = useQueryClient();
	const [isLoading, setIsLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [connectionCommand, setConnectionCommand] = useState<string | null>(
		null,
	);
	const [commandProjectId, setCommandProjectId] = useState('');
	const [accountId, setAccountId] = useState<string | null>(null);
	const [modalState, setModalState] = useState<ModalStateEnum>(
		ModalStateEnum.FORM,
	);

	const clearSubmitError = useCallback((): void => {
		setSubmitError(null);
	}, []);

	const { mutateAsync: createAccount } = useCreateAccount();
	const handleError = useAxiosError();

	const { data: connectionParams, isLoading: isConnectionParamsLoading } =
		useGetConnectionCredentials<GetConnectionCredentialsQueryResult>(
			{
				cloudProvider: INTEGRATION_TYPES.GCP,
			},
			{
				query: {
					onError: handleError,
				},
			},
		);

	const handleClose = useCallback((): void => {
		onClose();
	}, [onClose]);

	const generateCommand = useCallback(
		async (values: GcpSetupFormValues): Promise<void> => {
			try {
				setIsLoading(true);
				setSubmitError(null);

				const payload: CloudintegrationtypesPostableAccountDTO = {
					config: {
						gcp: {
							connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO.agent,
							deploymentRegion: values.deploymentRegion,
							deploymentProjectId: values.deploymentProjectId,
							// The agent monitors only the project it is deployed in.
							projectIds: [values.deploymentProjectId],
						},
					},
					credentials: {
						ingestionUrl: connectionParams?.data?.ingestionUrl || values.ingestionUrl,
						ingestionKey: connectionParams?.data?.ingestionKey || values.ingestionKey,
						sigNozApiUrl: connectionParams?.data?.sigNozApiUrl || values.sigNozApiUrl,
						sigNozApiKey: connectionParams?.data?.sigNozApiKey || values.sigNozApiKey,
					},
				};

				const response = await createAccount({
					pathParams: { cloudProvider: INTEGRATION_TYPES.GCP },
					data: payload,
				});

				const command = response.data.connectionArtifact.gcp?.cliCommand;
				if (!command) {
					setSubmitError(GENERATE_COMMAND_ERROR);
					return;
				}

				setAccountId(response.data.id);
				setCommandProjectId(values.deploymentProjectId);
				setConnectionCommand(command);
				setModalState(ModalStateEnum.WAITING);
				onCommandGenerated();

				void logEvent('GCP Integration: Account connection command generated', {
					id: response.data.id,
				});
			} catch (error) {
				const message = toAPIError(
					error as ErrorType<RenderErrorResponseDTO>,
					GENERATE_COMMAND_ERROR,
				).getErrorMessage();
				setSubmitError(message);
			} finally {
				setIsLoading(false);
			}
		},
		[connectionParams, createAccount, onCommandGenerated],
	);

	const handleConnected = useCallback(
		(account: CloudintegrationtypesAccountDTO): void => {
			void logEvent('GCP Integration: Account connected', {
				cloudIntegrationId: account.id,
				providerAccountId: account.providerAccountId,
			});
			toast.success('GCP account connected successfully', {
				position: 'bottom-right',
			});
			void invalidateListAccounts(queryClient, {
				cloudProvider: INTEGRATION_TYPES.GCP,
			});
			handleClose();
		},
		[handleClose, queryClient],
	);

	const handleTimeout = useCallback((): void => {
		setModalState(ModalStateEnum.ERROR);
		void logEvent('GCP Integration: Account connection attempt timed out', {
			id: accountId,
		});
	}, [accountId]);

	const handlePollingError = useCallback((): void => {
		setModalState(ModalStateEnum.ERROR);
	}, []);

	const checkConnectionAgain = useCallback((): void => {
		setModalState(ModalStateEnum.WAITING);
	}, []);

	useAgentConnectionPolling({
		accountId: accountId ?? '',
		enabled: modalState === ModalStateEnum.WAITING && accountId !== null,
		onConnected: handleConnected,
		onTimeout: handleTimeout,
		onError: handlePollingError,
	});

	return {
		isLoading,
		generateCommand,
		connectionParams: connectionParams?.data as
			| CloudintegrationtypesCredentialsDTO
			| undefined,
		isConnectionParamsLoading,
		submitError,
		clearSubmitError,
		connectionCommand,
		commandProjectId,
		modalState,
		checkConnectionAgain,
	};
}
