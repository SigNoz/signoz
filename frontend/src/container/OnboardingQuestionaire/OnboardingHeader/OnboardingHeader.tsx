import './OnboardingHeader.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { LifeBuoy } from 'lucide-react';

export function OnboardingHeader(): JSX.Element {
	return (
		<div className="header-container">
			<div className="logo-container">
				<img src="/Logos/signoz-brand-logo-new.svg" alt="SigNoz" />
				<span className="logo-text">SigNoz</span>
			</div>
			<div className="get-help-container">
				<LifeBuoy size={12} color={Color.BG_VANILLA_400} />
				<span className="get-help-text ">Get Help</span>
			</div>
		</div>
	);
}
