import { PropsWithChildren } from 'react';

import AuthFooter from './AuthFooter';
import AuthHeader from './AuthHeader';

import './AuthPageContainer.styles.scss';

type AuthPageContainerProps = PropsWithChildren<{
	isOnboarding?: boolean;
}>;

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
				<AuthFooter />
			</div>
		</div>
	);
}

AuthPageContainer.defaultProps = {
	isOnboarding: false,
};

export default AuthPageContainer;
