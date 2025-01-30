import { Form } from 'antd';
import { FormInstance } from 'antd/lib';
import {
	ActiveViewEnum,
	ModalStateEnum,
} from 'container/CloudIntegrationPage/HeroSection/types';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import {
	ConnectionUrlResponse,
	GenerateConnectionUrlPayload,
} from 'types/api/integrations/aws';
import { regions } from 'utils/regions';

import { useGenerateConnectionUrl } from './useGenerateConnectionUrl';

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
	handleIncludeAllRegionsChange: (checked: boolean) => void;
	handleRegionSelect: () => void;
	handleSubmit: () => Promise<void>;
	handleClose: () => void;
	setActiveView: (view: ActiveViewEnum) => void;
	allRegions: string[];
	accountId?: string;
	selectedDeploymentRegion: string | undefined;
	handleRegionChange: (value: string) => void;
}

export function useIntegrationModal({
	onClose,
}: UseIntegrationModalProps): UseIntegrationModal {
	const [form] = Form.useForm();
	const [modalState, setModalState] = useState<ModalStateEnum>(
		ModalStateEnum.FORM,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [accountId, setAccountId] = useState<string | undefined>(undefined);
	const [activeView, setActiveView] = useState<ActiveViewEnum>(
		ActiveViewEnum.FORM,
	);
	const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
	const [includeAllRegions, setIncludeAllRegions] = useState(false);
	const [selectedDeploymentRegion, setSelectedDeploymentRegion] = useState<
		string | undefined
	>(undefined);
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

	const handleIncludeAllRegionsChange = useCallback((checked: boolean): void => {
		setIncludeAllRegions(checked);
		if (checked) {
			setSelectedRegions(['all']);
		} else {
			setSelectedRegions([]);
		}
	}, []);

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

	const {
		mutate: generateUrl,
		isLoading: isGeneratingUrl,
	} = useGenerateConnectionUrl();

	const handleGenerateUrl = useCallback(
		(payload: GenerateConnectionUrlPayload): void => {
			generateUrl(payload, {
				onSuccess: (data: ConnectionUrlResponse) => {
					window.open(data.connection_url, '_blank');
					setModalState(ModalStateEnum.WAITING);
					setAccountId(data.account_id);
				},
				onError: () => {
					setModalState(ModalStateEnum.ERROR);
				},
			});
		},
		[generateUrl],
	);

	const handleSubmit = useCallback(async (): Promise<void> => {
		try {
			setIsLoading(true);
			const values = await form.validateFields();

			const payload: GenerateConnectionUrlPayload = {
				agent_config: {
					region: values.region,
				},
				account_config: {
					regions: includeAllRegions ? ['all'] : selectedRegions,
				},
			};

			handleGenerateUrl(payload);
		} catch (error) {
			console.error('Form submission failed:', error);
		} finally {
			setIsLoading(false);
		}
	}, [form, includeAllRegions, selectedRegions, handleGenerateUrl]);

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
		handleIncludeAllRegionsChange,
		handleRegionSelect,
		handleSubmit,
		handleClose,
		setActiveView,
		allRegions,
		accountId,
		setModalState,
		selectedDeploymentRegion,
		handleRegionChange,
	};
}
