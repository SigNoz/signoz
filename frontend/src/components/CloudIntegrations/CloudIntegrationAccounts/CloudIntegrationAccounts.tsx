import { useState } from 'react';
import { Button } from '@signozhq/button';
import { Color } from '@signozhq/design-tokens';
import { DrawerWrapper } from '@signozhq/drawer';
import { Select } from 'antd';
import ConnectNewAzureAccount from 'container/Integrations/CloudIntegration/AzureServices/AzureAccount/ConnectNewAzureAccount';
import EditAzureAccount from 'container/Integrations/CloudIntegration/AzureServices/AzureAccount/EditAzureAccount';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { CloudAccount } from 'container/Integrations/types';
import { useGetConnectionParams } from 'hooks/integration/useGetConnectionParams';
import useAxiosError from 'hooks/useAxiosError';
import { Dot, PencilLine, Plus } from 'lucide-react';

import './CloudIntegrationAccounts.styles.scss';

export type DrawerMode = 'edit' | 'add';

export default function CloudIntegrationAccounts({
	selectedAccount,
	accounts,
	isLoadingAccounts,
	onSelectAccount,
	refetchAccounts,
}: {
	selectedAccount: CloudAccount | null;
	accounts: CloudAccount[];
	isLoadingAccounts: boolean;
	onSelectAccount: (account: CloudAccount) => void;
	refetchAccounts: () => void;
}): JSX.Element {
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [mode, setMode] = useState<DrawerMode>('add');

	const handleDrawerOpenChange = (open: boolean): void => {
		setIsDrawerOpen(open);
	};

	const handleEditAccount = (): void => {
		setMode('edit');
		setIsDrawerOpen(true);
	};

	const handleAddNewAccount = (): void => {
		setMode('add');
		setIsDrawerOpen(true);
	};

	const handleError = useAxiosError();

	const {
		data: connectionParams,
		isLoading: isConnectionParamsLoading,
	} = useGetConnectionParams({
		cloudServiceId: INTEGRATION_TYPES.AZURE,
		options: { onError: handleError },
	});

	const handleSelectAccount = (value: string): void => {
		const account = accounts.find(
			(account) => account.cloud_account_id === value,
		);

		if (account) {
			onSelectAccount(account);
		}
	};

	const handleAccountConnected = (): void => {
		refetchAccounts();
	};

	const handleAccountUpdated = (): void => {
		refetchAccounts();
	};

	const renderDrawerContent = (): JSX.Element => {
		return (
			<div className="cloud-integration-accounts-drawer-content">
				{mode === 'edit' ? (
					<div className="edit-account-content">
						<EditAzureAccount
							selectedAccount={selectedAccount as CloudAccount}
							connectionParams={connectionParams || {}}
							isConnectionParamsLoading={isConnectionParamsLoading}
							onAccountUpdated={handleAccountUpdated}
						/>
					</div>
				) : (
					<div className="add-new-account-content">
						<ConnectNewAzureAccount
							connectionParams={connectionParams || {}}
							isConnectionParamsLoading={isConnectionParamsLoading}
							onAccountConnected={handleAccountConnected}
						/>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="cloud-integration-accounts">
			{selectedAccount && (
				<div className="selected-cloud-integration-account-section">
					<div className="selected-cloud-integration-account-section-header">
						<div className="selected-cloud-integration-account-section-header-title">
							<div className="selected-cloud-integration-account-status">
								<Dot size={24} color={Color.BG_FOREST_500} />
							</div>
							<div className="selected-cloud-integration-account-section-header-title-text">
								Subscription ID :
								<span className="azure-cloud-account-selector">
									<Select
										value={selectedAccount?.cloud_account_id}
										options={accounts.map((account) => ({
											label: account.cloud_account_id,
											value: account.cloud_account_id,
										}))}
										onChange={handleSelectAccount}
										loading={isLoadingAccounts}
										placeholder="Select Account"
									/>
								</span>
							</div>
						</div>
						<div className="selected-cloud-integration-account-settings">
							<Button
								variant="link"
								color="secondary"
								prefixIcon={<PencilLine size={14} />}
								onClick={handleEditAccount}
							>
								Edit Account
							</Button>

							<Button
								variant="link"
								color="secondary"
								prefixIcon={<Plus size={14} />}
								onClick={handleAddNewAccount}
							>
								Add New Account
							</Button>
						</div>
					</div>
				</div>
			)}

			<div className="account-settings-container">
				<DrawerWrapper
					open={isDrawerOpen}
					onOpenChange={handleDrawerOpenChange}
					type="panel"
					header={{
						title: mode === 'add' ? 'Connect with Azure' : 'Edit Azure Account',
					}}
					content={renderDrawerContent()}
					showCloseButton
					allowOutsideClick={mode === 'edit'}
					direction="right"
				/>
			</div>
		</div>
	);
}
