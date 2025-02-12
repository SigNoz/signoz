import './HeroSection.style.scss';

import { useIsDarkMode } from 'hooks/useDarkMode';

import AccountActions from './components/AccountActions';

function HeroSection(): JSX.Element {
	const isDarkMode = useIsDarkMode();
	return (
		<div
			className="hero-section"
			style={
				isDarkMode
					? {
							backgroundImage: `url('/Images/integrations-hero-bg.png')`,
					  }
					: {}
			}
		>
			<div className="hero-section__icon">
				<img src="/Logos/aws-dark.svg" alt="aws-logo" />
			</div>
			<div className="hero-section__details">
				<div className="title">Amazon Web Services</div>
				<div className="description">
					One-click setup for AWS monitoring with SigNoz
				</div>
				<AccountActions />
			</div>
		</div>
	);
}

export default HeroSection;
