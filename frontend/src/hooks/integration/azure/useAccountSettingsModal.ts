import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { toast } from '@signozhq/ui';
import { Form } from 'antd';
import { FormInstance } from 'antd/lib';
import { useUpdateAccount } from 'api/generated/services/cloudintegration';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { CloudAccount } from 'container/Integrations/types';
import { isEqual } from 'lodash-es';

import logEvent from '../../../api/common/logEvent';

interface UseAccountSettingsModalProps {
	onClose: () => void;
	account: CloudAccount;
	setActiveAccount: Dispatch<SetStateAction<CloudAccount | null>>;
}

interface UseAccountSettingsModal {
	form: FormInstance;
	isLoading: boolean;
	resourceGroups: string[];
	isSaveDisabled: boolean;
	setResourceGroups: Dispatch<SetStateAction<string[]>>;
	handleSubmit: () => Promise<void>;
	handleClose: () => void;
}

export function useAccountSettingsModal({
	onClose,
	account,
	setActiveAccount,
}: UseAccountSettingsModalProps): UseAccountSettingsModal {
	const [form] = Form.useForm();
	const { mutate: updateAccount, isLoading } = useUpdateAccount();
	const accountConfig = useMemo(
		() => ('deployment_region' in account.config ? account.config : null),
		[account.config],
	);
	const [resourceGroups, setResourceGroups] = useState<string[]>(
		accountConfig?.resource_groups || [],
	);

	useEffect(() => {
		if (!accountConfig) {
			return;
		}

		form.setFieldsValue({
			region: accountConfig.deployment_region,
			resourceGroups: accountConfig.resource_groups,
		});
		setResourceGroups(accountConfig.resource_groups);
	}, [accountConfig, form]);

	const handleSubmit = useCallback(async (): Promise<void> => {
		try {
			const values = await form.validateFields();

			updateAccount(
				{
					pathParams: {
						cloudProvider: INTEGRATION_TYPES.AZURE,
						id: account?.id || '',
					},
					data: {
						config: {
							azure: {
								resourceGroups: values.resourceGroups || [],
							},
						},
					},
				},
				{
					onSuccess: () => {
						const nextConfig = {
							deployment_region: accountConfig?.deployment_region || '',
							resource_groups: values.resourceGroups || [],
						};

						setActiveAccount({
							...account,
							config: nextConfig,
						});
						onClose();

						toast.success('Account settings updated successfully', {
							position: 'bottom-right',
						});

						logEvent('Azure Integration: Account settings updated', {
							cloudAccountId: account.cloud_account_id,
							deploymentRegion: nextConfig.deployment_region,
							resourceGroups: nextConfig.resource_groups,
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
	}, [form, updateAccount, account, setActiveAccount, onClose]);

	const isSaveDisabled = useMemo(() => {
		if (!accountConfig) {
			return true;
		}

		const formResourceGroups = resourceGroups || [];

		return isEqual(
			[...formResourceGroups].sort(),
			[...accountConfig.resource_groups].sort(),
		);
	}, [accountConfig, resourceGroups, form]);

	const handleClose = useCallback(() => {
		onClose();
	}, [onClose]);

	return {
		form,
		isLoading,
		resourceGroups,
		isSaveDisabled,
		setResourceGroups,
		handleSubmit,
		handleClose,
	};
}
