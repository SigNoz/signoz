import { IntegrationType } from 'container/Integrations/types';

import AccountActions from '../CloudIntegration/AmazonWebServices/AccountActions/AccountActions';
import { getIntegrationMetadata } from '../CloudIntegration/utils';

import './HeroSection.style.scss';

function HeroSection({ type }: { type: IntegrationType }): JSX.Element {
	const { title, description, logo: integrationLogo } = getIntegrationMetadata(
		type,
	);

	return (
		<div className="hero-section">
			<div className="hero-section__details">
				<div className="hero-section__details-header">
					<div className="hero-section__icon">
						<img src={integrationLogo} alt={type} />
					</div>

					<div className="hero-section__details-title">{title}</div>
				</div>
				<div className="hero-section__details-description">{description}</div>
			</div>

			<AccountActions type={type} />
		</div>
	);
}

export default HeroSection;
