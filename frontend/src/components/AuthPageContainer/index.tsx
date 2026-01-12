import './AuthPageContainer.styles.scss';

import { ReactNode } from 'react';

import AuthHeader from './AuthHeader';
import TrustBadgesFooter from './TrustBadgesFooter';

interface AuthPageContainerProps {
	children: ReactNode;
	isOnboarding?: boolean;
}

function AuthPageContainer({
	children,
	isOnboarding = false,
}: AuthPageContainerProps): JSX.Element {
	return (
		<div className="auth-page-wrapper">
			<div className="auth-page-background">
				<div className="auth-page-dots bg-dot-pattern masked-dots" />
				<div className="auth-page-gradient" />
				<div className="auth-page-line-left" />
				<div className="auth-page-line-right" />
			</div>
			<div className="auth-page-layout">
				<AuthHeader />
				<main
					className={`auth-page-content ${isOnboarding ? 'onboarding-flow' : ''}`}
				>
					{children}
				</main>
				<TrustBadgesFooter />
			</div>
		</div>
	);
}

AuthPageContainer.defaultProps = {
	isOnboarding: false,
};

export default AuthPageContainer;
