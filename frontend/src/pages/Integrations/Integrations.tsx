import './Integrations.styles.scss';

import Header from './Header';
import IntegrationsList from './IntegrationsList';

function Integrations(): JSX.Element {
	return (
		<div className="integrations-container">
			<div className="integrations-content">
				<Header />
				<IntegrationsList />
			</div>
		</div>
	);
}

export default Integrations;
