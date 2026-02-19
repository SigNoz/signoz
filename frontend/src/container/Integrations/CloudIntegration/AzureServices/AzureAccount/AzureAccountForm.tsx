import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { Button } from '@signozhq/button';
import { toast } from '@signozhq/sonner';
import { Form, Select } from 'antd';
import { Modal } from 'antd/lib';
import { removeIntegrationAccount } from 'api/integration';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	AZURE_REGIONS,
	INTEGRATION_TYPES,
} from 'container/Integrations/constants';
import {
	AzureCloudAccountConfig,
	CloudAccount,
} from 'container/Integrations/types';
import { CornerDownRight, Unlink } from 'lucide-react';
import { ConnectionParams } from 'types/api/integrations/types';

interface AzureAccountFormProps {
	mode?: 'add' | 'edit';
	selectedAccount: CloudAccount | null;
	connectionParams: ConnectionParams;
	isConnectionParamsLoading: boolean;
	isLoading: boolean;
	onSubmit: (values: {
		primaryRegion: string;
		resourceGroups: string[];
	}) => void;
	submitButtonText?: string;
	showDisconnectAccountButton?: boolean;
}

export const AzureAccountForm = ({
	mode = 'add',
	selectedAccount,
	connectionParams,
	isConnectionParamsLoading,
	isLoading,
	onSubmit,
	submitButtonText = 'Fetch Deployment Command',
	showDisconnectAccountButton = false,
}: AzureAccountFormProps): JSX.Element => {
	const [azureAccountForm] = Form.useForm();
	const queryClient = useQueryClient();
	const [isModalOpen, setIsModalOpen] = useState(false);

	const handleSubmit = useCallback((): void => {
		azureAccountForm
			.validateFields()
			.then((values) => {
				onSubmit({
					primaryRegion: values.primaryRegion,
					resourceGroups: values.resourceGroups,
				});
			})
			.catch((error) => {
				console.error('Form submission failed:', error);
			});
	}, [azureAccountForm, onSubmit]);

	const handleDisconnect = (): void => {
		setIsModalOpen(true);
	};

	const {
		mutate: removeIntegration,
		isLoading: isRemoveIntegrationLoading,
	} = useMutation(removeIntegrationAccount, {
		onSuccess: () => {
			toast.success('Azure account disconnected successfully', {
				description: 'Azure account disconnected successfully',
				position: 'top-right',
				duration: 3000,
			});

			queryClient.invalidateQueries([REACT_QUERY_KEY.CLOUD_INTEGRATION_ACCOUNTS]);
			setIsModalOpen(false);
		},
		onError: (error) => {
			console.error('Failed to remove integration:', error);
		},
	});

	const handleOk = (): void => {
		removeIntegration({
			cloudServiceId: INTEGRATION_TYPES.AZURE,
			accountId: selectedAccount?.id as string,
		});
	};

	const handleCancel = (): void => {
		setIsModalOpen(false);
	};

	return (
		<Form
			name="azure-account-form"
			className="azure-account-form"
			form={azureAccountForm}
			layout="vertical"
			autoComplete="off"
			initialValues={{
				primaryRegion:
					(selectedAccount?.config as AzureCloudAccountConfig)?.deployment_region ||
					undefined,
				resourceGroups:
					(selectedAccount?.config as AzureCloudAccountConfig)?.resource_groups ||
					[],
			}}
		>
			<div className="azure-account-configure-agent-step-primary-region">
				<div className="azure-account-configure-agent-step-primary-region-title">
					Select primary region
				</div>
				<div className="azure-account-configure-agent-step-primary-region-select">
					<Form.Item
						name="primaryRegion"
						rules={[{ required: true, message: 'Please select a primary region' }]}
					>
						<Select
							disabled={mode === 'edit'}
							placeholder="Select primary region"
							options={AZURE_REGIONS}
							showSearch
							filterOption={(input, option): boolean =>
								option?.label?.toLowerCase().includes(input.toLowerCase()) ||
								option?.value?.toLowerCase().includes(input.toLowerCase()) ||
								false
							}
							notFoundContent={null}
						/>
					</Form.Item>
				</div>
			</div>

			<div className="azure-account-configure-agent-step-resource-groups">
				<div className="azure-account-configure-agent-step-resource-groups-title">
					Enter resource groups you want to monitor
				</div>

				<div className="azure-account-configure-agent-step-resource-groups-select">
					<Form.Item
						name="resourceGroups"
						rules={[
							{
								required: true,
								message: 'Please enter resource groups you want to monitor',
							},
						]}
					>
						<Select
							placeholder="Enter resource groups you want to monitor"
							options={[]}
							mode="tags"
							notFoundContent={null}
							filterOption={false}
							showSearch={false}
						/>
					</Form.Item>
				</div>
			</div>

			<div className="azure-account-actions-container">
				{showDisconnectAccountButton && (
					<div className="azure-account-disconnect-container">
						<Button
							variant="solid"
							color="destructive"
							prefixIcon={<Unlink size={14} />}
							size="sm"
							onClick={handleDisconnect}
							disabled={isRemoveIntegrationLoading}
						>
							Disconnect
						</Button>
					</div>
				)}

				<Button
					variant="solid"
					color="primary"
					onClick={handleSubmit}
					size="sm"
					prefixIcon={<CornerDownRight size={12} />}
					loading={
						isConnectionParamsLoading || isLoading || isRemoveIntegrationLoading
					}
					disabled={
						isConnectionParamsLoading ||
						!connectionParams ||
						isLoading ||
						isRemoveIntegrationLoading
					}
				>
					{submitButtonText}
				</Button>
			</div>

			<Modal
				className="azure-account-disconnect-modal"
				open={isModalOpen}
				title="Remove integration"
				onOk={handleOk}
				onCancel={handleCancel}
				okText="Remove Integration"
				okButtonProps={{
					danger: true,
				}}
			>
				<div className="remove-integration-modal-content">
					Removing this account will remove all components created for sending
					telemetry to SigNoz in your Azure account within the next ~15 minutes
				</div>
			</Modal>
		</Form>
	);
};
