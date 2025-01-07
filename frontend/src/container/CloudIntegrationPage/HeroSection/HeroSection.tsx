import './HeroSection.style.scss';

<<<<<<< HEAD
import AccountActions from './components/AccountActions';
=======
import { cloudAccountsData } from '../ServicesSection/data';
import AccountActions from './AccountActions';
>>>>>>> 6c3b326ef (feat: implement basic cloud account management UI in HeroSection)

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
					One-click setup for AWS monitoring with SigNoz
				</div>
<<<<<<< HEAD
				<AccountActions />
=======
				<AccountActions accounts={cloudAccountsData.accounts} />
>>>>>>> 6c3b326ef (feat: implement basic cloud account management UI in HeroSection)
			</div>
		</div>
	);
}

export default HeroSection;
