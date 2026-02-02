import { RequestIntegrationBtn } from 'container/Integrations/RequestIntegrationBtn';
import { IntegrationType } from 'container/Integrations/types';

import Header from './Header/Header';
import HeroSection from './HeroSection/HeroSection';
import ServicesTabs from './ServicesSection/ServicesTabs';

const CloudIntegration = ({ type }: { type: IntegrationType }): JSX.Element => {
	return (
		<div className="cloud-integration">
			<Header title={type} />
			<HeroSection />
			<RequestIntegrationBtn
				type={type}
				message="Can't find the service you're looking for? Request more integrations"
			/>
			<ServicesTabs />
		</div>
	);
};

export default CloudIntegration;
