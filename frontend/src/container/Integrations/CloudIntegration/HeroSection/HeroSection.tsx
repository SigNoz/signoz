import {
	AWS_INTEGRATION,
	AZURE_INTEGRATION,
} from 'container/Integrations/constants';
import { IntegrationType } from 'container/Integrations/types';

import AccountActions from './components/AccountActions';

import './HeroSection.style.scss';

function HeroSection({
	integration,
}: {
	integration: IntegrationType;
}): JSX.Element {
	const INTERGRATION_DATA =
		integration === IntegrationType.AWS_SERVICES
			? AWS_INTEGRATION
			: AZURE_INTEGRATION;

	return (
		<div className="hero-section">
			<div className="hero-section__icon">
				<img src={INTERGRATION_DATA.icon} alt={INTERGRATION_DATA.icon_alt} />
			</div>
			<div className="hero-section__details">
				<div className="title">{INTERGRATION_DATA.title}</div>
				<div className="description">{INTERGRATION_DATA.description}</div>
				<AccountActions />
			</div>
		</div>
	);
}

export default HeroSection;
