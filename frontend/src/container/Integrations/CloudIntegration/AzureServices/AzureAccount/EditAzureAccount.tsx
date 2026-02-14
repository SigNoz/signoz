import { useCallback } from 'react';
import { toast } from '@signozhq/sonner';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { CloudAccount } from 'container/Integrations/types';
import { useUpdateAccountConfig } from 'hooks/integration/useUpdateAccountConfig';
import {
	AzureAccountConfig,
	ConnectionParams,
} from 'types/api/integrations/types';

import { AzureAccountForm } from './AzureAccountForm';

import './AzureAccount.styles.scss';

interface EditAzureAccountProps {
	selectedAccount: CloudAccount;
	connectionParams: ConnectionParams;
	isConnectionParamsLoading: boolean;
	onAccountUpdated: () => void;
}

function EditAzureAccount({
	selectedAccount,
	connectionParams,
	isConnectionParamsLoading,
	onAccountUpdated,
}: EditAzureAccountProps): JSX.Element {
	const {
		mutate: updateAzureAccountConfig,
		isLoading,
	} = useUpdateAccountConfig();

	const handleSubmit = useCallback(
		async ({
			primaryRegion,
			resourceGroups,
		}: {
			primaryRegion: string;
			resourceGroups: string[];
		}): Promise<void> => {
			try {
				const payload: AzureAccountConfig = {
					config: {
						deployment_region: primaryRegion,
						resource_groups: resourceGroups,
					},
				};

				updateAzureAccountConfig(
					{
						cloudServiceId: INTEGRATION_TYPES.AZURE,
						accountId: selectedAccount?.id,
						payload,
					},
					{
						onSuccess: () => {
							toast.success('Success', {
								description: 'Azure account updated successfully',
								position: 'top-right',
								duration: 3000,
							});

							onAccountUpdated();
						},
					},
				);
			} catch (error) {
				console.error('Form submission failed:', error);
			}
		},
		[updateAzureAccountConfig, selectedAccount?.id, onAccountUpdated],
	);

	return (
		<div className="azure-account-container">
			<AzureAccountForm
				mode="edit"
				selectedAccount={selectedAccount}
				connectionParams={connectionParams}
				isConnectionParamsLoading={isConnectionParamsLoading}
				onSubmit={handleSubmit}
				isLoading={isLoading}
				submitButtonText="Save Changes"
			/>
		</div>
	);
}

export default EditAzureAccount;
