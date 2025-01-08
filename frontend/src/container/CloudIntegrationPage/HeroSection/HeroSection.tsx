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
					One-click setup for AWS monitoring with SigNoz
				</div>

				<AccountActions accounts={[]} />
			</div>
		</div>
	);
}

export default HeroSection;
