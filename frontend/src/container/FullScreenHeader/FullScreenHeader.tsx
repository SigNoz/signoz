/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './FullScreenHeader.styles.scss';

import { useSafeNavigate } from 'hooks/useSafeNavigate';

export default function FullScreenHeader({
	overrideRoute,
}: {
	overrideRoute?: string;
}): React.ReactElement {
	const { safeNavigate } = useSafeNavigate();
	const handleLogoClick = (): void => {
		safeNavigate(overrideRoute || '/');
	};
	return (
		<div className="full-screen-header-container">
			<div className="brand-logo" onClick={handleLogoClick}>
				<img src="/Logos/signoz-brand-logo.svg" alt="SigNoz" />

				<div className="brand-logo-name">SigNoz</div>
			</div>
		</div>
	);
}

FullScreenHeader.defaultProps = {
	overrideRoute: '/',
};
