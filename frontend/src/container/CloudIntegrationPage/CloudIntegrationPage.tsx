import {
	IntegrationType,
	RequestIntegrationBtn,
} from 'pages/Integrations/RequestIntegrationBtn';

import Header from './Header/Header';
import HeroSection from './HeroSection/HeroSection';
import ServicesTabs from './ServicesSection/ServicesTabs';

function CloudIntegrationPage(): JSX.Element {
	return (
		<div>
			<Header />
			<HeroSection />
			<RequestIntegrationBtn
				type={IntegrationType.AWS_SERVICES}
				message="Can't find the AWS service you're looking for? Request more integrations"
			/>
			<ServicesTabs />
		</div>
	);
}

export default CloudIntegrationPage;
