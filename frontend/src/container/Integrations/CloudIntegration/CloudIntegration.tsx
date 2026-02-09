import { RequestIntegrationBtn } from 'container/Integrations/RequestIntegrationBtn';
import { IntegrationType } from 'container/Integrations/types';

import AWSTabs from './AmazonWebServices/ServicesTabs';
import AzureServices from './AzureServices';
import Header from './Header/Header';
import HeroSection from './HeroSection/HeroSection';

const CloudIntegration = ({ type }: { type: IntegrationType }): JSX.Element => {
	return (
		<div className="cloud-integration">
			<Header title={type} />
			<HeroSection integration={type} />
			<RequestIntegrationBtn
				type={type}
				message="Can't find the service you're looking for? Request more integrations"
			/>
			{type === IntegrationType.AWS_SERVICES && <AWSTabs />}
			{type === IntegrationType.AZURE_SERVICES && <AzureServices />}
		</div>
	);
};

export default CloudIntegration;
