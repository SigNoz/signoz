import useUrlQuery from 'hooks/useUrlQuery';

import HeroSection from './HeroSection/HeroSection';
import ServiceDetails from './ServiceDetails/ServiceDetails';
import ServicesList from './ServicesList';

import './ServicesTabs.style.scss';

function ServicesTabs(): JSX.Element {
	const urlQuery = useUrlQuery();
	const cloudAccountId = urlQuery.get('cloudAccountId') || '';

	return (
		<div className="services-tabs">
			<HeroSection />

			<div className="services-section">
				<div className="services-section__sidebar">
					<ServicesList cloudAccountId={cloudAccountId} />
				</div>
				<div className="services-section__content">
					<ServiceDetails />
				</div>
			</div>
		</div>
	);
}

export default ServicesTabs;
