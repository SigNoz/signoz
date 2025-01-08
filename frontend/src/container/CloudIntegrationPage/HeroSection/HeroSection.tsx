import './HeroSection.style.scss';

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
<<<<<<< HEAD
					Monitor your AWS infrastructure with SigNoz. Get metrics and logs from your
					AWS services.
=======
					One-click setup for AWS monitoring with SigNoz
>>>>>>> 6c3b326ef (feat: implement basic cloud account management UI in HeroSection)
				</div>
				<AccountActions accounts={[]} />
			</div>
		</div>
	);
}

export default HeroSection;
