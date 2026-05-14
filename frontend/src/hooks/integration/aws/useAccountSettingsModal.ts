import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { toast } from '@signozhq/ui/sonner';
import { Form } from 'antd';
import { FormInstance } from 'antd/lib';
import { useUpdateAccount } from 'api/generated/services/cloudintegration';
import { CloudAccount } from 'container/Integrations/CloudIntegration/AmazonWebServices/types';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { isEqual } from 'lodash-es';
import { regions } from 'utils/regions';

import logEvent from '../../../api/common/logEvent';

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
	isSaveDisabled: boolean;
	setSelectedRegions: Dispatch<SetStateAction<string[]>>;
	setIncludeAllRegions: Dispatch<SetStateAction<boolean>>;
	handleSubmit: () => Promise<void>;
	handleClose: () => void;
}

const allRegions = (): string[] =>
	regions.flatMap((r) => r.subRegions.map((sr) => sr.name));

export function useAccountSettingsModal({
	onClose,
	account,
	setActiveAccount,
}: UseAccountSettingsModalProps): UseAccountSettingsModal {
	const [form] = Form.useForm();
	const { mutate: updateAccount, isLoading } = useUpdateAccount();
	const accountRegions = useMemo(
		() => account?.config?.regions || [],
		[account?.config?.regions],
	);
	const [isInitialRegionsSet, setIsInitialRegionsSet] = useState(false);

	const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
	const [includeAllRegions, setIncludeAllRegions] = useState(false);

	// Initialize regions from account when modal opens
	useEffect(() => {
		if (accountRegions.length > 0 && !isInitialRegionsSet) {
			setSelectedRegions(
				accountRegions.includes('all') ? allRegions() : accountRegions,
			);
			setIsInitialRegionsSet(true);
			setIncludeAllRegions(
				accountRegions.includes('all') ||
					accountRegions.length === allRegions().length,
			);
		}
	}, [accountRegions, isInitialRegionsSet]);

	const handleSubmit = useCallback(async (): Promise<void> => {
		try {
			await form.validateFields();
			const payload = {
				config: {
					aws: {
						regions: selectedRegions,
					},
				},
			};

			updateAccount(
				{
					pathParams: {
						cloudProvider: INTEGRATION_TYPES.AWS,
						id: account?.id || '',
					},
					data: payload,
				},
				{
					onSuccess: () => {
						const newActiveAccount = {
							...account,
							config: {
								...account.config,
								regions: selectedRegions,
							},
						};
						setActiveAccount(newActiveAccount);
						onClose();
						toast.success('Account settings updated successfully', {
							position: 'bottom-right',
						});

						logEvent('AWS Integration: Account settings Updated', {
							cloudAccountId: newActiveAccount.cloud_account_id,
							enabledRegions: newActiveAccount.config.regions,
						});
					},
					onError: (error) => {
						toast.error('Failed to update account settings', {
							description: error?.message,
							position: 'bottom-right',
						});
					},
				},
			);
		} catch (error) {
			console.error('Form submission failed:', error);
		}
	}, [form, selectedRegions, updateAccount, account, setActiveAccount, onClose]);

	const isSaveDisabled = useMemo(
		() =>
			isEqual([...selectedRegions].sort(), [...accountRegions].sort()) ||
			selectedRegions.length === 0,
		[selectedRegions, accountRegions],
	);

	const handleClose = useCallback(() => {
		onClose();
	}, [onClose]);

	return {
		form,
		isLoading,
		selectedRegions,
		includeAllRegions,
		isSaveDisabled,
		setSelectedRegions,
		setIncludeAllRegions,
		handleSubmit,
		handleClose,
	};
}
