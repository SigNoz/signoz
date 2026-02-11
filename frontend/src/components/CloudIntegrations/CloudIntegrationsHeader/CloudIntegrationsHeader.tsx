import {
	AWS_INTEGRATION,
	AZURE_INTEGRATION,
} from 'container/Integrations/constants';
import { CloudAccount, IntegrationType } from 'container/Integrations/types';

import CloudIntegrationAccounts from '../CloudIntegrationAccounts';

import './CloudIntegrationsHeader.styles.scss';

export default function CloudIntegrationsHeader({
	cloudServiceId,
	selectedAccount,
	accounts,
	isLoadingAccounts,
	onSelectAccount,
}: {
	selectedAccount: CloudAccount | null;
	accounts: CloudAccount[] | [];
	isLoadingAccounts: boolean;
	onSelectAccount: (account: CloudAccount) => void;
	cloudServiceId: IntegrationType;
}): JSX.Element {
	const INTEGRATION_DATA =
		cloudServiceId === IntegrationType.AWS_SERVICES
			? AWS_INTEGRATION
			: AZURE_INTEGRATION;

	return (
		<div className="cloud-integrations-header-section">
			<div className="cloud-integrations-header">
				<div className="cloud-integrations-title-section">
					<div className="cloud-integrations-title">
						<img
							className="cloud-integrations-icon"
							src={INTEGRATION_DATA.icon}
							alt={INTEGRATION_DATA.icon_alt}
						/>

						{INTEGRATION_DATA.title}
					</div>
					<div className="cloud-integrations-description">
						{INTEGRATION_DATA.description}
					</div>
				</div>
			</div>

			<div className="cloud-integrations-accounts-list">
				<CloudIntegrationAccounts
					selectedAccount={selectedAccount}
					accounts={accounts}
					isLoadingAccounts={isLoadingAccounts}
					onSelectAccount={onSelectAccount}
				/>
			</div>
		</div>
	);
}
