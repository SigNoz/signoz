import './Header.styles.scss';

export function OnboardingHeader(): JSX.Element {
	return (
		<div className="header-container">
			<div className="logo-container">
				<img src="/Logos/signoz-brand-logo-new.svg" alt="SigNoz" />
				<span className="logo-text">SigNoz</span>
			</div>
			<div className="get-help-container">
				<img src="/Icons/get_help.svg" alt="Get Help" />
				<span className="get-help-text ">Get Help</span>
			</div>
		</div>
	);
}
