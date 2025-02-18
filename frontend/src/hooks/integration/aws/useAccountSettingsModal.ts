import { Form } from 'antd';
import { FormInstance } from 'antd/lib';
import { CloudAccount } from 'container/CloudIntegrationPage/ServicesSection/types';
import { useUpdateAccountConfig } from 'hooks/integration/aws/useUpdateAccountConfig';
import { isEqual } from 'lodash-es';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { AccountConfigPayload } from 'types/api/integrations/aws';
import { regions } from 'utils/regions';

interface UseAccountSettingsModalProps {
	onClose: () => void;
	account: CloudAccount;
	setActiveAccount: Dispatch<SetStateAction<CloudAccount | null>>;
}

interface UseAccountSettingsModal {
	form: FormInstance;
	isLoading: boolean;
	selectedRegions: string[];
	includeAllRegions: boolean;
	isRegionSelectOpen: boolean;
	isSaveDisabled: boolean;
	setSelectedRegions: Dispatch<SetStateAction<string[]>>;
	setIncludeAllRegions: Dispatch<SetStateAction<boolean>>;
	setIsRegionSelectOpen: Dispatch<SetStateAction<boolean>>;
	handleIncludeAllRegionsChange: (checked: boolean) => void;
	handleSubmit: () => Promise<void>;
	handleClose: () => void;
}

const allRegions = (): string[] =>
	regions.flatMap((r) => r.subRegions.map((sr) => sr.name));

const getRegionPreviewText = (regions: string[] | undefined): string[] => {
	if (!regions) return [];
	if (regions.includes('all')) {
		return allRegions();
	}
	return regions;
};

export function useAccountSettingsModal({
	onClose,
	account,
	setActiveAccount,
}: UseAccountSettingsModalProps): UseAccountSettingsModal {
	const [form] = Form.useForm();
	const { mutate: updateConfig, isLoading } = useUpdateAccountConfig();
	const accountRegions = useMemo(() => account?.config?.regions || [], [
		account?.config?.regions,
	]);
	const [isInitialRegionsSet, setIsInitialRegionsSet] = useState(false);

	const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
	const [includeAllRegions, setIncludeAllRegions] = useState(false);
	const [isRegionSelectOpen, setIsRegionSelectOpen] = useState(false);

	// Initialize regions from account when modal opens
	useEffect(() => {
		if (accountRegions.length > 0 && !isInitialRegionsSet) {
			setSelectedRegions(accountRegions);
			setIsInitialRegionsSet(true);
			setIncludeAllRegions(accountRegions.includes('all'));
		}
	}, [accountRegions, isInitialRegionsSet]);

	const handleSubmit = useCallback(async (): Promise<void> => {
		try {
			await form.validateFields();
			const payload: AccountConfigPayload = {
				config: {
					regions: selectedRegions,
				},
			};

			updateConfig(
				{ accountId: account?.id, payload },
				{
					onSuccess: (response) => {
						setActiveAccount(response.data);
						onClose();
					},
				},
			);
		} catch (error) {
			console.error('Form submission failed:', error);
		}
	}, [
		form,
		selectedRegions,
		updateConfig,
		account?.id,
		setActiveAccount,
		onClose,
	]);

	const isSaveDisabled = useMemo(
		() => isEqual(selectedRegions.sort(), accountRegions.sort()),
		[selectedRegions, accountRegions],
	);

	const handleIncludeAllRegionsChange = useCallback((checked: boolean): void => {
		setIncludeAllRegions(checked);
		if (checked) {
			setSelectedRegions(['all']);
		} else {
			setSelectedRegions([]);
		}
	}, []);

	const handleClose = useCallback(() => {
		setIsRegionSelectOpen(false);
		onClose();
	}, [onClose]);

	return {
		form,
		isLoading,
		selectedRegions,
		includeAllRegions,
		isRegionSelectOpen,
		isSaveDisabled,
		setSelectedRegions,
		setIncludeAllRegions,
		setIsRegionSelectOpen,
		handleIncludeAllRegionsChange,
		handleSubmit,
		handleClose,
	};
}

export { getRegionPreviewText };
