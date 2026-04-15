import { useCallback } from 'react';
import { Button } from '@signozhq/button';
import { LifeBuoy } from 'lucide-react';
import { openExternalLink } from 'utils/navigation';

import signozBrandLogoUrl from '@/assets/Logos/signoz-brand-logo.svg';

import './AuthHeader.styles.scss';

function AuthHeader(): JSX.Element {
	const handleGetHelp = useCallback((): void => {
		openExternalLink('https://signoz.io/support/');
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
				prefixIcon={<LifeBuoy size={12} />}
				onClick={handleGetHelp}
			>
				Get Help
			</Button>
		</header>
	);
}

export default AuthHeader;
