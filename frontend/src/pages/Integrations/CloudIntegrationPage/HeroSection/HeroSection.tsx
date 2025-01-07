import './HeroSection.style.scss';

function HeroSection(): JSX.Element {
	return (
		<div
			className="hero-section"
			style={{
				backgroundImage: `linear-gradient(
					90deg,
					rgba(18, 19, 23, 0.95) 0%,
					rgba(18, 19, 23, 0.8) 50%,
					rgba(18, 19, 23, 0.6) 100%
				),
				url('/Images/integrations-hero-bg.png')`,
			}}
		>
			<div className="hero-section__icon">
				<img src="/Logos/aws-dark.svg" alt="aws-logo" />
			</div>
			<div className="hero-section__details">
				<div className="title">AWS Web Services</div>
				<div className="description">
					One-click setup for AWS monitoring with SigNoz
				</div>
				<div className="hero-section__buttons">
					<button className="hero-section__button" type="button">
						Integrate Now
					</button>
				</div>
			</div>
		</div>
	);
}

export default HeroSection;
