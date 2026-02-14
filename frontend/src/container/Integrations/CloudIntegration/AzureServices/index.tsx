import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from 'antd';
import CloudIntegrationsHeader from 'components/CloudIntegrations/CloudIntegrationsHeader';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import {
	AzureConfig,
	AzureService,
	CloudAccount,
	IntegrationType,
} from 'container/Integrations/types';
import { useGetAccountServices } from 'hooks/integration/useGetAccountServices';
import { useGetCloudIntegrationAccounts } from 'hooks/integration/useGetCloudIntegrationAccounts';
import useUrlQuery from 'hooks/useUrlQuery';

import { getAccountById } from '../utils';
import AzureServiceDetails from './AzureServiceDetails/AzureServiceDetails';
import AzureServicesListView from './AzureServicesListView';

import './AzureServices.styles.scss';

function AzureServices(): JSX.Element {
	const urlQuery = useUrlQuery();
	const [selectedAccount, setSelectedAccount] = useState<CloudAccount | null>(
		null,
	);
	const [selectedService, setSelectedService] = useState<AzureService | null>(
		null,
	);

	const {
		data: accounts = [],
		isLoading: isLoadingAccounts,
		isFetching: isFetchingAccounts,
		refetch: refetchAccounts,
	} = useGetCloudIntegrationAccounts(INTEGRATION_TYPES.AZURE);

	const initialAccount = useMemo(
		() =>
			accounts?.length
				? getAccountById(accounts, urlQuery.get('cloudAccountId') || '') ||
				  accounts[0]
				: null,
		[accounts, urlQuery],
	);

	// Sync selectedAccount with initialAccount when accounts load (enables Subscription ID display)
	// Cast: hook returns AWS-typed CloudAccount[] but AZURE fetch returns Azure-shaped accounts
	useEffect(() => {
		setSelectedAccount(initialAccount as CloudAccount | null);
	}, [initialAccount]);

	const {
		data: azureServices = [],
		isLoading: isLoadingAzureServices,
	} = useGetAccountServices(INTEGRATION_TYPES.AZURE);

	const enabledServices = useMemo(
		() =>
			azureServices?.filter(
				(service: AzureService) =>
					service.config?.logs?.some((log: AzureConfig) => log.enabled) ||
					service.config?.metrics?.some((metric: AzureConfig) => metric.enabled),
			) ?? [],
		[azureServices],
	);

	const notEnabledServices = useMemo(
		() =>
			azureServices?.filter(
				(service: AzureService) =>
					!service.config?.logs?.some((log: AzureConfig) => log.enabled) ||
					!service.config?.metrics?.some((metric: AzureConfig) => metric.enabled),
			) ?? [],
		[azureServices],
	);

	useEffect(() => {
		if (enabledServices.length > 0) {
			setSelectedService(enabledServices[0]);
		} else if (notEnabledServices.length > 0) {
			setSelectedService(notEnabledServices[0]);
		}
	}, [enabledServices, notEnabledServices]);

	return (
		<div className="azure-services-container">
			<CloudIntegrationsHeader
				cloudServiceId={IntegrationType.AZURE_SERVICES}
				selectedAccount={selectedAccount}
				accounts={accounts}
				isLoadingAccounts={isLoadingAccounts}
				onSelectAccount={setSelectedAccount}
				refetchAccounts={refetchAccounts}
			/>
			<div className="azure-services-content">
				<div className="azure-services-list-section">
					{(isLoadingAzureServices || isFetchingAccounts) && (
						<div className="azure-services-list-section-loading-skeleton">
							<div className="azure-services-list-section-loading-skeleton-sidebar">
								<Skeleton active />
								<Skeleton active />
							</div>
							<div className="azure-services-list-section-loading-skeleton-main">
								<Skeleton active />
								<Skeleton active />
								<Skeleton active />
							</div>
						</div>
					)}

					{!isLoadingAzureServices && !isFetchingAccounts && (
						<div className="azure-services-list-section-content">
							<AzureServicesListView
								selectedService={selectedService}
								enabledServices={enabledServices}
								notEnabledServices={notEnabledServices}
								onSelectService={setSelectedService}
							/>

							<AzureServiceDetails
								selectedService={selectedService}
								cloudAccountId={selectedAccount?.cloud_account_id || ''}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default AzureServices;
