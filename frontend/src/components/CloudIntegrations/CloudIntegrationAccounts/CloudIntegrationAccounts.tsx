import { Button } from '@signozhq/button';
import { Color } from '@signozhq/design-tokens';
import { DrawerWrapper } from '@signozhq/drawer';
import { CloudAccount } from 'container/Integrations/types';
import { ArrowLeftRight, Dot } from 'lucide-react';

import './CloudIntegrationAccounts.styles.scss';

export default function CloudIntegrationAccounts({
	selectedAccount,
	accounts,
	isLoadingAccounts,
	onSelectAccount,
}: {
	selectedAccount: CloudAccount | null;
	accounts: CloudAccount[];
	isLoadingAccounts: boolean;
	onSelectAccount: (account: CloudAccount) => void;
}): JSX.Element {
	console.log('selectedAccount', selectedAccount);
	console.log('accounts', accounts);
	console.log('isLoadingAccounts', isLoadingAccounts);
	console.log('onSelectAccount', onSelectAccount);

	return (
		<div className="cloud-integration-accounts">
			<div className="selected-cloud-integration-account-section">
				<div className="selected-cloud-integration-account-section-header">
					<div className="selected-cloud-integration-account-section-header-title">
						<div className="selected-cloud-integration-account-status">
							<Dot size={16} color={Color.BG_FOREST_500} />
						</div>
						<div className="selected-cloud-integration-account-section-header-title-text">
							Subscription ID : {selectedAccount?.cloud_account_id}
						</div>
					</div>
					<div className="selected-cloud-integration-account-settings">
						Account Settings
					</div>
				</div>
			</div>

			{!selectedAccount && (
				<div className="connect-with-azure-button-container">
					<DrawerWrapper
						trigger={
							<Button
								variant="solid"
								color="primary"
								prefixIcon={<ArrowLeftRight size={16} />}
								size="sm"
								block
								loading={isLoadingAccounts}
								disabled={isLoadingAccounts}
							>
								Connect with Azure
							</Button>
						}
						type="panel"
						header={{
							title: 'Drawer Title',
							description: 'This is a description of the drawer content',
						}}
						content={
							<div className="p-4">
								<p>Main content of the drawer goes here</p>
							</div>
						}
						showCloseButton
						allowOutsideClick={false}
						direction="right"
					/>
				</div>
			)}
		</div>
	);
}
