import AccountActions from './components/AccountActions';

import './HeroSection.style.scss';

function HeroSection(): JSX.Element {
	return (
		<div className="hero-section">
			<div className="hero-section__details">
				<div className="hero-section__details-header">
					<div className="hero-section__icon">
						<img src="/Logos/aws-dark.svg" alt="AWS" />
					</div>

					<div className="hero-section__details-title">AWS</div>
				</div>
				<div className="hero-section__details-description">
					AWS is a cloud computing platform that provides a range of services for
					building and running applications.
				</div>
			</div>
			<AccountActions />
		</div>
	);
}

export default HeroSection;
