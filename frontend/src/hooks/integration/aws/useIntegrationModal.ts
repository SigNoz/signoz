import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui';
import { Form, FormInstance } from 'antd';
import {
	CreateAccountMutationResult,
	GetConnectionCredentialsQueryResult,
	invalidateListAccounts,
	useCreateAccount,
} from 'api/generated/services/cloudintegration';
import { useGetConnectionCredentials } from 'api/generated/services/cloudintegration';
import {
	CloudintegrationtypesCredentialsDTO,
	CloudintegrationtypesPostableAccountDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	ActiveViewEnum,
	ModalStateEnum,
} from 'container/Integrations/CloudIntegration/AmazonWebServices/HeroSection/types';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import useAxiosError from 'hooks/useAxiosError';
import { regions } from 'utils/regions';

import logEvent from '../../../api/common/logEvent';

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
	isGeneratingUrl: boolean;
	setSelectedRegions: Dispatch<SetStateAction<string[]>>;
	setIncludeAllRegions: Dispatch<SetStateAction<boolean>>;
	handleRegionSelect: () => void;
	handleSubmit: () => Promise<void>;
	handleClose: () => void;
	setActiveView: (view: ActiveViewEnum) => void;
	allRegions: string[];
	accountId?: string;
	selectedDeploymentRegion: string | undefined;
	handleRegionChange: (value: string) => void;
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
}: UseIntegrationModalProps): UseIntegrationModal {
	const queryClient = useQueryClient();
	const [form] = Form.useForm();
	const [modalState, setModalState] = useState<ModalStateEnum>(
		ModalStateEnum.FORM,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [accountId, setAccountId] = useState<string | undefined>();
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
		onClose();
	}, [onClose]);

	const handleConnectionSuccess = useCallback(
		(payload: { cloudAccountId: string; status?: unknown }): void => {
			void logEvent('AWS Integration: Account connected', {
				cloudAccountId: payload.cloudAccountId,
				status: payload.status,
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

	const handleConnectionTimeout = useCallback(
		(payload: { id?: string }): void => {
			setModalState(ModalStateEnum.ERROR);
			void logEvent('AWS Integration: Account connection attempt timed out', {
				id: payload.id,
			});
		},
		[],
	);

	const handleConnectionError = useCallback((): void => {
		setModalState(ModalStateEnum.ERROR);
	}, []);

	const { mutate: generateUrl, isLoading: isGeneratingUrl } = useCreateAccount();

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

	const handleGenerateUrl = useCallback(
		(payload: CloudintegrationtypesPostableAccountDTO): void => {
			generateUrl(
				{
					pathParams: { cloudProvider: INTEGRATION_TYPES.AWS },
					data: payload,
				},
				{
					onSuccess: (response: CreateAccountMutationResult) => {
						const accountId = response.data.id;
						const connectionUrl =
							response.data.connectionArtifact.aws?.connectionUrl ?? '';

						void logEvent(
							'AWS Integration: Account connection attempt redirected to AWS',
							{
								id: accountId,
							},
						);
						// oxlint-disable-next-line signoz/no-raw-absolute-path -- connectionUrl is an external AWS console URL, not an internal path
						window.open(connectionUrl, '_blank');
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
		[generateUrl],
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

			handleGenerateUrl(payload);
		} catch (error) {
			console.error('Form submission failed:', error);
		} finally {
			setIsLoading(false);
		}
	}, [form, selectedRegions, handleGenerateUrl, connectionParams]);

	return {
		form,
		modalState,
		isLoading,
		activeView,
		selectedRegions,
		includeAllRegions,
		isGeneratingUrl,
		setSelectedRegions,
		setIncludeAllRegions,
		handleRegionSelect,
		handleSubmit,
		handleClose,
		setActiveView,
		allRegions,
		accountId,
		setModalState,
		selectedDeploymentRegion,
		handleRegionChange,
		connectionParams: connectionParams?.data as
			| CloudintegrationtypesCredentialsDTO
			| undefined,
		isConnectionParamsLoading,
		handleConnectionSuccess,
		handleConnectionTimeout,
		handleConnectionError,
	};
}
