/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './FullViewHeader.styles.scss';

import history from 'lib/history';

export default function FullViewHeader(): React.ReactElement {
	const handleLogoClick = (): void => {
		history.push('/');
	};
	return (
		<div className="full-view-header-container">
			<div className="brand-logo" onClick={handleLogoClick}>
				<img src="/Logos/signoz-brand-logo.svg" alt="SigNoz" />

				<div className="brand-logo-name">SigNoz</div>
			</div>
		</div>
	);
}
