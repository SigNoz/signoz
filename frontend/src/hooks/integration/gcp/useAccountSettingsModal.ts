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
	projectIds: string[];
	isSaveDisabled: boolean;
	setProjectIds: Dispatch<SetStateAction<string[]>>;
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
		() => ('project_ids' in account.config ? account.config : null),
		[account.config],
	);
	const [projectIds, setProjectIds] = useState<string[]>(
		accountConfig?.project_ids || [],
	);

	useEffect(() => {
		if (!accountConfig) {
			return;
		}

		form.setFieldsValue({
			projectIds: accountConfig.project_ids,
		});
		setProjectIds(accountConfig.project_ids);
	}, [accountConfig, form]);

	const handleSubmit = useCallback(async (): Promise<void> => {
		try {
			const values = await form.validateFields();

			if (!accountConfig) {
				return;
			}

			updateAccount(
				{
					pathParams: {
						cloudProvider: INTEGRATION_TYPES.GCP,
						id: account?.id || '',
					},
					data: {
						config: {
							gcp: {
								// Deployment region & project ID are immutable in the UI, but the
								// Updatable GCP DTO requires all three fields to be sent.
								deploymentRegion: accountConfig.deployment_region,
								deploymentProjectId: accountConfig.deployment_project_id,
								projectIds: values.projectIds || [],
							},
						},
					},
				},
				{
					onSuccess: () => {
						const nextConfig = {
							deployment_region: accountConfig.deployment_region,
							deployment_project_id: accountConfig.deployment_project_id,
							project_ids: values.projectIds || [],
						};

						setActiveAccount({
							...account,
							config: nextConfig,
						});
						onClose();

						toast.success('Account settings updated successfully', {
							position: 'bottom-right',
						});

						void logEvent('GCP Integration: Account settings updated', {
							cloudAccountId: account.cloud_account_id,
							deploymentRegion: nextConfig.deployment_region,
							projectIds: nextConfig.project_ids,
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
	}, [form, updateAccount, account, accountConfig, setActiveAccount, onClose]);

	const isSaveDisabled = useMemo(() => {
		if (!accountConfig) {
			return true;
		}

		return isEqual(
			[...(projectIds || [])].sort(),
			[...accountConfig.project_ids].sort(),
		);
	}, [accountConfig, projectIds]);

	const handleClose = useCallback(() => {
		onClose();
	}, [onClose]);

	return {
		form,
		isLoading,
		projectIds,
		isSaveDisabled,
		setProjectIds,
		handleSubmit,
		handleClose,
	};
}
