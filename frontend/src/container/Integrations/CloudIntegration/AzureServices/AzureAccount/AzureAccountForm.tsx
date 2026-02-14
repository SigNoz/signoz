import { useCallback } from 'react';
import { Button } from '@signozhq/button';
import { Form, Select } from 'antd';
import { AZURE_REGIONS } from 'container/Integrations/constants';
import {
	AzureCloudAccountConfig,
	CloudAccount,
} from 'container/Integrations/types';
import { CornerDownRight } from 'lucide-react';
import { ConnectionParams } from 'types/api/integrations/types';

export const AzureAccountForm = ({
	mode = 'add',
	selectedAccount,
	connectionParams,
	isConnectionParamsLoading,
	isLoading,
	onSubmit,
	submitButtonText = 'Fetch Deployment Command',
}: {
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
}): JSX.Element => {
	const [azureAccountForm] = Form.useForm();

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

			<div className="azure-account-fetch-deployment-command">
				<Button
					variant="solid"
					color="primary"
					onClick={handleSubmit}
					size="sm"
					prefixIcon={<CornerDownRight size={12} />}
					loading={isConnectionParamsLoading || isLoading}
					disabled={isConnectionParamsLoading || !connectionParams || isLoading}
				>
					{submitButtonText}
				</Button>
			</div>
		</Form>
	);
};
