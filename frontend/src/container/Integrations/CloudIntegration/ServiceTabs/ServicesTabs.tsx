import { IntegrationType } from 'container/Integrations/types';
import useUrlQuery from 'hooks/useUrlQuery';

import HeroSection from '../../HeroSection/HeroSection';
import ServiceDetails from '../AmazonWebServices/ServiceDetails/ServiceDetails';
import ServicesList from '../ServicesList';

import './ServicesTabs.style.scss';

function ServicesTabs({ type }: { type: IntegrationType }): JSX.Element {
	const urlQuery = useUrlQuery();
	const cloudAccountId = urlQuery.get('cloudAccountId') || '';

	return (
		<div className="services-tabs">
			<HeroSection type={type} />

			<div className="services-section">
				<div className="services-section__sidebar">
					<ServicesList cloudAccountId={cloudAccountId} type={type} />
				</div>
				<div className="services-section__content">
					<ServiceDetails type={type} />
				</div>
			</div>
		</div>
	);
}

export default ServicesTabs;
