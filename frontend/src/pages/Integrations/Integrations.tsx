import './Integrations.styles.scss';

import { useState } from 'react';

import Header from './Header';
import IntegrationDetailPage from './IntegrationDetailPage/IntegrationDetailPage';
import IntegrationsList from './IntegrationsList';

function Integrations(): JSX.Element {
	const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
		null,
	);
	return (
		<div className="integrations-container">
			<div className="integrations-content">
				{selectedIntegration ? (
					<IntegrationDetailPage
						selectedIntegration={selectedIntegration}
						setSelectedIntegration={setSelectedIntegration}
					/>
				) : (
					<>
						<Header />
						<IntegrationsList setSelectedIntegration={setSelectedIntegration} />
					</>
				)}
			</div>
		</div>
	);
}

export default Integrations;
