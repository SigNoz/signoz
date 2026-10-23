import { useCallback, useState } from 'react';
import {
	CloudintegrationtypesAccountDTO,
	CloudintegrationtypesCredentialsDTO,
	CloudintegrationtypesGCPConnectionMethodDTO,
} from 'api/generated/services/sigNoz.schemas';
import { GcpSetupFormValues } from 'container/Integrations/CloudIntegration/GoogleCloudPlatform/AddNewAccount/types';
import { ModalStateEnum } from 'container/Integrations/HeroSection/types';

import logEvent from '../../../api/common/logEvent';
import { useAgentConnectionPolling } from './useAgentConnectionPolling';
import { useGcpAccountSetup } from './useGcpAccountSetup';

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
	const {
		connectionParams,
		isConnectionParamsLoading,
		isLoading,
		submitError,
		setSubmitError,
		clearSubmitError,
		createGcpAccount,
		runSubmit,
		handleConnected,
	} = useGcpAccountSetup({ onClose });

	const [connectionCommand, setConnectionCommand] = useState<string | null>(
		null,
	);
	const [commandProjectId, setCommandProjectId] = useState('');
	const [accountId, setAccountId] = useState<string | null>(null);
	const [modalState, setModalState] = useState<ModalStateEnum>(
		ModalStateEnum.FORM,
	);

	const generateCommand = useCallback(
		(values: GcpSetupFormValues): Promise<void> =>
			runSubmit(async () => {
				const account = await createGcpAccount(
					{
						connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO.agent,
						deploymentRegion: values.deploymentRegion,
						deploymentProjectId: values.deploymentProjectId,
						// The agent monitors only the project it is deployed in.
						projectIds: [values.deploymentProjectId],
					},
					values,
				);

				const command = account.connectionArtifact.gcp?.cliCommand;
				if (!command) {
					setSubmitError(GENERATE_COMMAND_ERROR);
					return;
				}

				setAccountId(account.id);
				setCommandProjectId(values.deploymentProjectId);
				setConnectionCommand(command);
				setModalState(ModalStateEnum.WAITING);
				onCommandGenerated();

				void logEvent('GCP Integration: Account connection command generated', {
					id: account.id,
				});
			}, GENERATE_COMMAND_ERROR),
		[createGcpAccount, onCommandGenerated, runSubmit, setSubmitError],
	);

	const handleAgentConnected = useCallback(
		(account: CloudintegrationtypesAccountDTO): void => {
			handleConnected({
				cloudIntegrationId: account.id,
				providerAccountId: account.providerAccountId,
			});
		},
		[handleConnected],
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
		onConnected: handleAgentConnected,
		onTimeout: handleTimeout,
		onError: handlePollingError,
	});

	return {
		isLoading,
		generateCommand,
		connectionParams,
		isConnectionParamsLoading,
		submitError,
		clearSubmitError,
		connectionCommand,
		commandProjectId,
		modalState,
		checkConnectionAgain,
	};
}
