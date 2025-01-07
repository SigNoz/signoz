import './HeroSection.style.scss';

import { cloudAccountsData } from '../ServicesSection/data';
import AccountActions from './AccountActions';

function HeroSection(): JSX.Element {
	return (
		<div
			className="hero-section"
			style={{ backgroundImage: `url('/Images/integrations-hero-bg.png')` }}
		>
			<div className="hero-section__icon">
				<img src="/Logos/aws-dark.svg" alt="aws-logo" />
			</div>
			<div className="hero-section__details">
				<div className="title">AWS Web Services</div>
				<div className="description">
					Monitor your AWS infrastructure with SigNoz. Get metrics and logs from your
					AWS services.
				</div>
				<AccountActions accounts={cloudAccountsData.accounts} />
			</div>
		</div>
	);
}

export default HeroSection;
