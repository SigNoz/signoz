import history from 'lib/history';

import signozBrandLogoUrl from '@/assets/Logos/signoz-brand-logo.svg';

import './FullScreenHeader.styles.scss';

export default function FullScreenHeader({
	overrideRoute,
}: {
	overrideRoute?: string;
}): React.ReactElement {
	const handleLogoClick = (): void => {
		history.push(overrideRoute || '/');
	};
	return (
		<div className="full-screen-header-container">
			<div className="brand-logo" onClick={handleLogoClick}>
				<img src={signozBrandLogoUrl} alt="SigNoz" />

				<div className="brand-logo-name">SigNoz</div>
			</div>
		</div>
	);
}

FullScreenHeader.defaultProps = {
	overrideRoute: '/',
};
