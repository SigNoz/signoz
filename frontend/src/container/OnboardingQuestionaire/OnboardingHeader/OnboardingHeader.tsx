import './OnboardingHeader.styles.scss';

export function OnboardingHeader(): JSX.Element {
	return (
		<div className="header-container">
			<div className="logo-container">
				<img src="/Logos/signoz-brand-logo.svg" alt="SigNoz" />
				<span className="logo-text">SigNoz</span>
			</div>
		</div>
	);
}
