import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import { Form, FormInstance } from 'antd';
import {
	CreateAccountMutationResult,
	GetConnectionCredentialsQueryResult,
	invalidateListAccounts,
	useCreateAccount,
	useGetConnectionCredentials,
} from 'api/generated/services/cloudintegration';
import {
	CloudintegrationtypesAccountDTO,
	CloudintegrationtypesCredentialsDTO,
	CloudintegrationtypesPostableAccountDTO,
} from 'api/generated/services/sigNoz.schemas';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import {
	ActiveViewEnum,
	ModalStateEnum,
} from 'container/Integrations/HeroSection/types';
import useAxiosError from 'hooks/useAxiosError';
import { regions } from 'utils/regions';

import logEvent from '../../../api/common/logEvent';
import { useAgentConnectionPolling } from '../useAgentConnectionPolling';

interface UseIntegrationModalProps {
	onClose: () => void;
}

interface UseIntegrationModal {
	form: FormInstance;
	modalState: ModalStateEnum;
	setModalState: Dispatch<SetStateAction<ModalStateEnum>>;
	isLoading: boolean;
	activeView: ActiveViewEnum;
	selectedRegions: string[];
	includeAllRegions: boolean;
	isGeneratingCommand: boolean;
	connectionCommand: string | null;
	setSelectedRegions: Dispatch<SetStateAction<string[]>>;
	setIncludeAllRegions: Dispatch<SetStateAction<boolean>>;
	handleRegionSelect: () => void;
	handleSubmit: () => Promise<void>;
	handleClose: () => void;
	setActiveView: (view: ActiveViewEnum) => void;
	allRegions: string[];
	selectedDeploymentRegion: string | undefined;
	handleRegionChange: (value: string) => void;
	connectionParams?: CloudintegrationtypesCredentialsDTO;
	isConnectionParamsLoading: boolean;
	checkConnectionAgain: () => void;
}

export function useIntegrationModal({
	onClose,
}: UseIntegrationModalProps): UseIntegrationModal {
	const queryClient = useQueryClient();
	const [form] = Form.useForm();
	const [modalState, setModalState] = useState<ModalStateEnum>(
		ModalStateEnum.FORM,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [accountId, setAccountId] = useState<string | undefined>();
	const [connectionCommand, setConnectionCommand] = useState<string | null>(
		null,
	);
	const [activeView, setActiveView] = useState<ActiveViewEnum>(
		ActiveViewEnum.FORM,
	);
	const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
	const [includeAllRegions, setIncludeAllRegions] = useState(false);
	const [selectedDeploymentRegion, setSelectedDeploymentRegion] = useState<
		string | undefined
	>();
	const allRegions = useMemo(
		() => regions.flatMap((r) => r.subRegions.map((sr) => sr.name)),
		[],
	);

	useEffect(() => {
		form.setFieldsValue({ region: selectedDeploymentRegion });
	}, [selectedDeploymentRegion, form]);

	const handleRegionChange = (value: string): void => {
		setSelectedDeploymentRegion(value);
	};

	const handleRegionSelect = useCallback((): void => {
		setActiveView(ActiveViewEnum.SELECT_REGIONS);
	}, []);

	const handleClose = useCallback((): void => {
		setActiveView(ActiveViewEnum.FORM);
		setSelectedRegions([]);
		setIncludeAllRegions(false);
		setModalState(ModalStateEnum.FORM);
		setConnectionCommand(null);
		onClose();
	}, [onClose]);

	const handleConnectionSuccess = useCallback(
		(account: CloudintegrationtypesAccountDTO): void => {
			void logEvent('AWS Integration: Account connected', {
				cloudAccountId: account.providerAccountId ?? account.id,
				status: account.agentReport,
			});
			toast.success('AWS account connected successfully', {
				position: 'bottom-right',
			});
			void invalidateListAccounts(queryClient, {
				cloudProvider: INTEGRATION_TYPES.AWS,
			});
			handleClose();
		},
		[handleClose, queryClient],
	);

	const handleConnectionTimeout = useCallback((): void => {
		setModalState(ModalStateEnum.ERROR);
		void logEvent('AWS Integration: Account connection attempt timed out', {
			id: accountId,
		});
	}, [accountId]);

	const handleConnectionError = useCallback((): void => {
		setModalState(ModalStateEnum.ERROR);
	}, []);

	const checkConnectionAgain = useCallback((): void => {
		setModalState(ModalStateEnum.WAITING);
	}, []);

	useAgentConnectionPolling({
		cloudProvider: INTEGRATION_TYPES.AWS,
		accountId: accountId ?? '',
		enabled: modalState === ModalStateEnum.WAITING && accountId !== undefined,
		onConnected: handleConnectionSuccess,
		onTimeout: handleConnectionTimeout,
		onError: handleConnectionError,
	});

	const { mutate: createAccount, isLoading: isGeneratingCommand } =
		useCreateAccount();

	const handleError = useAxiosError();
	const { data: connectionParams, isLoading: isConnectionParamsLoading } =
		useGetConnectionCredentials<GetConnectionCredentialsQueryResult>(
			{
				cloudProvider: INTEGRATION_TYPES.AWS,
			},
			{
				query: {
					onError: handleError,
				},
			},
		);

	const handleGenerateCommand = useCallback(
		(payload: CloudintegrationtypesPostableAccountDTO): void => {
			createAccount(
				{
					pathParams: { cloudProvider: INTEGRATION_TYPES.AWS },
					data: payload,
				},
				{
					onSuccess: (response: CreateAccountMutationResult) => {
						const accountId = response.data.id;
						const command = response.data.connectionArtifact.aws?.cliCommand;
						if (!command) {
							setModalState(ModalStateEnum.ERROR);
							toast.error('Failed to generate the AWS setup command', {
								position: 'bottom-right',
							});
							return;
						}

						void logEvent('AWS Integration: Account connection command generated', {
							id: accountId,
						});
						setConnectionCommand(command);
						setModalState(ModalStateEnum.WAITING);
						setAccountId(accountId);
					},
					onError: () => {
						setModalState(ModalStateEnum.ERROR);
						toast.error('Failed to create account connection', {
							position: 'bottom-right',
						});
					},
				},
			);
		},
		[createAccount],
	);

	const handleSubmit = useCallback(async (): Promise<void> => {
		try {
			setIsLoading(true);
			const values = await form.validateFields();

			const payload: CloudintegrationtypesPostableAccountDTO = {
				config: {
					aws: {
						deploymentRegion: values.region,
						regions: selectedRegions,
					},
				},
				credentials: {
					ingestionUrl: connectionParams?.data?.ingestionUrl || values.ingestionUrl,
					ingestionKey: connectionParams?.data?.ingestionKey || values.ingestionKey,
					sigNozApiUrl: connectionParams?.data?.sigNozApiUrl || values.sigNozApiUrl,
					sigNozApiKey: connectionParams?.data?.sigNozApiKey || values.sigNozApiKey,
				},
			};

			handleGenerateCommand(payload);
		} catch (error) {
			console.error('Form submission failed:', error);
		} finally {
			setIsLoading(false);
		}
	}, [form, selectedRegions, handleGenerateCommand, connectionParams]);

	return {
		form,
		modalState,
		isLoading,
		activeView,
		selectedRegions,
		includeAllRegions,
		isGeneratingCommand,
		connectionCommand,
		setSelectedRegions,
		setIncludeAllRegions,
		handleRegionSelect,
		handleSubmit,
		handleClose,
		setActiveView,
		allRegions,
		setModalState,
		selectedDeploymentRegion,
		handleRegionChange,
		connectionParams: connectionParams?.data as
			| CloudintegrationtypesCredentialsDTO
			| undefined,
		isConnectionParamsLoading,
		checkConnectionAgain,
	};
}
