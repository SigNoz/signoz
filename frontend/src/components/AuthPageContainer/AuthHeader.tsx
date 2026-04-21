import { useCallback } from 'react';
import { Button } from '@signozhq/ui';
import { LifeBuoy } from 'lucide-react';

import signozBrandLogoUrl from '@/assets/Logos/signoz-brand-logo.svg';

import './AuthHeader.styles.scss';

function AuthHeader(): JSX.Element {
	const handleGetHelp = useCallback((): void => {
		window.open('https://signoz.io/support/', '_blank');
	}, []);

	return (
		<header className="auth-header">
			<div className="auth-header-logo">
				<img
					src={signozBrandLogoUrl}
					alt="SigNoz"
					className="auth-header-logo-icon"
				/>
				<span className="auth-header-logo-text">SigNoz</span>
			</div>
			<Button
				className="auth-header-help-button"
				prefix={<LifeBuoy size={12} />}
				onClick={handleGetHelp}
				variant="solid"
				color="none"
			>
				Get Help
			</Button>
		</header>
	);
}

export default AuthHeader;
