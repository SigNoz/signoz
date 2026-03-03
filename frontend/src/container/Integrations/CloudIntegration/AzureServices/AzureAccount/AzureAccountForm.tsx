import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { Button } from '@signozhq/button';
import { toast } from '@signozhq/sonner';
import { Select } from 'antd';
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

type AzureAccountFormValues = {
	primaryRegion: string;
	resourceGroups: string[];
};

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
	const queryClient = useQueryClient();
	const [isModalOpen, setIsModalOpen] = useState(false);

	const {
		control,
		handleSubmit: handleFormSubmit,
	} = useForm<AzureAccountFormValues>({
		defaultValues: {
			primaryRegion:
				(selectedAccount?.config as AzureCloudAccountConfig)?.deployment_region ||
				'',
			resourceGroups:
				(selectedAccount?.config as AzureCloudAccountConfig)?.resource_groups || [],
		},
	});

	const onFormSubmit = useCallback(
		(values: AzureAccountFormValues): void => {
			onSubmit({
				primaryRegion: values.primaryRegion,
				resourceGroups: values.resourceGroups,
			});
		},
		[onSubmit],
	);

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
		<form className="azure-account-form">
			<div className="azure-account-configure-agent-step-primary-region">
				<div className="azure-account-configure-agent-step-primary-region-title">
					Select primary region
				</div>
				<div className="azure-account-configure-agent-step-primary-region-select">
					<Controller
						control={control}
						name="primaryRegion"
						rules={{
							required: 'Please select a primary region',
						}}
						render={({ field, fieldState }): JSX.Element => (
							<div className="azure-account-form-regions-selector">
								<Select
									{...field}
									disabled={mode === 'edit'}
									placeholder="Select primary region"
									options={AZURE_REGIONS}
									showSearch
									filterOption={(input, option): boolean => {
										const label = String(option?.label ?? '');
										const value = String(option?.value ?? '');

										return (
											label.toLowerCase().includes(input.toLowerCase()) ||
											value.toLowerCase().includes(input.toLowerCase())
										);
									}}
									notFoundContent={null}
								/>
								{fieldState.error && (
									<div className="azure-account-form-error">
										{fieldState.error.message}
									</div>
								)}
							</div>
						)}
					/>
				</div>
			</div>

			<div className="azure-account-configure-agent-step-resource-groups">
				<div className="azure-account-configure-agent-step-resource-groups-title">
					Enter resource groups you want to monitor
				</div>

				<div className="azure-account-configure-agent-step-resource-groups-select">
					<Controller
						control={control}
						name="resourceGroups"
						rules={{
							required: 'Please enter resource groups you want to monitor',
							validate: (value: string[] | undefined): boolean | string =>
								Array.isArray(value) && value.length > 0
									? true
									: 'Please enter resource groups you want to monitor',
						}}
						render={({ field, fieldState }): JSX.Element => (
							<div className="azure-account-form-resource-groups-selector">
								<Select
									{...field}
									placeholder="Enter resource groups you want to monitor"
									options={[]}
									mode="tags"
									notFoundContent={null}
									filterOption={false}
									showSearch={false}
								/>
								{fieldState.error && (
									<div className="azure-account-form-error">
										{fieldState.error.message}
									</div>
								)}
							</div>
						)}
					/>
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
					onClick={handleFormSubmit(onFormSubmit)}
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
		</form>
	);
};
