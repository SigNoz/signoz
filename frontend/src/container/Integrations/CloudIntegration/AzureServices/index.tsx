import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';
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
	const navigate = useNavigate();
	const cloudAccountId = urlQuery.get('cloudAccountId');
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
	} = useGetCloudIntegrationAccounts(INTEGRATION_TYPES.AZURE);

	const initialAccount = useMemo(
		() =>
			accounts?.length
				? getAccountById(accounts, urlQuery.get('cloudAccountId') || '') ||
				  accounts[0]
				: null,
		[accounts, urlQuery],
	);

	console.log('initialAccount', initialAccount, isLoadingAccounts);

	const {
		data: azureServices = [],
		isLoading: isLoadingAzureServices,
	} = useGetAccountServices(INTEGRATION_TYPES.AZURE);

	const enabledServices = azureServices?.filter(
		(service: AzureService) =>
			service.config?.logs?.some((log: AzureConfig) => log.enabled) ||
			service.config?.metrics?.some((metric: AzureConfig) => metric.enabled),
	);

	const notEnabledServices = azureServices?.filter(
		(service: AzureService) =>
			!service.config?.logs?.some((log: AzureConfig) => log.enabled) ||
			!service.config?.metrics?.some((metric: AzureConfig) => metric.enabled),
	);

	// only on mount and first load of azure services, set the first enabled service as selected, if no enabled services, set the first not enabled service as selected
	useEffect(() => {
		if (enabledServices.length > 0) {
			setSelectedService(enabledServices[0]);
		} else if (notEnabledServices.length > 0) {
			setSelectedService(notEnabledServices[0]);
		}
	}, [enabledServices, notEnabledServices]);

	console.log('selectedService', selectedService);

	return (
		<div className="azure-services-container">
			<CloudIntegrationsHeader
				cloudServiceId={IntegrationType.AZURE_SERVICES}
				selectedAccount={selectedAccount}
				accounts={accounts}
				isLoadingAccounts={isLoadingAccounts}
				onSelectAccount={setSelectedAccount}
			/>
			<div className="azure-services-content">
				<div className="azure-services-list-section">
					{(isLoadingAzureServices || isFetchingAccounts) && (
						<div className="azure-services-list-section-loading-skeleton">
							<Skeleton active />
						</div>
					)}

					{!isLoadingAzureServices && !isFetchingAccounts && (
						<div className="azure-services-list-section-content">
							<AzureServicesListView
								selectedService={selectedService}
								enabledServices={enabledServices || []}
								notEnabledServices={notEnabledServices || []}
								onSelectService={setSelectedService}
							/>

							<AzureServiceDetails
								selectedService={selectedService}
								cloudAccountId={cloudAccountId || ''}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default AzureServices;
