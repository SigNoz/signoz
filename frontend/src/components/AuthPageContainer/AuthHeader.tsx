import './AuthHeader.styles.scss';

import { LifeBuoy } from 'lucide-react';

function AuthHeader(): JSX.Element {
	const handleGetHelp = (): void => {
		window.open('mailto:cloud-support@signoz.io', '_blank');
	};

	return (
		<header className="auth-header">
			<div className="auth-header-logo">
				<img
					src="/Logos/signoz-brand-logo.svg"
					alt="SigNoz"
					className="auth-header-logo-icon"
				/>
				<span className="auth-header-logo-text">SigNoz</span>
			</div>
			<button
				type="button"
				className="auth-header-help-button"
				onClick={handleGetHelp}
			>
				<LifeBuoy size={12} />
				<span>Get Help</span>
			</button>
		</header>
	);
}

export default AuthHeader;
