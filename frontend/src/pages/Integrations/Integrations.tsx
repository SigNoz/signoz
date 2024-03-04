import './Integrations.styles.scss';

import { useState } from 'react';

import Header from './Header';
import IntegrationDetailPage from './IntegrationDetailPage/IntegrationDetailPage';
import IntegrationsList from './IntegrationsList';

function Integrations(): JSX.Element {
	const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
		null,
	);

	const [searchTerm, setSearchTerm] = useState<string>('');
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
						<Header setSearchTerm={setSearchTerm} searchTerm={searchTerm} />
						<IntegrationsList
							setSelectedIntegration={setSelectedIntegration}
							searchTerm={searchTerm}
						/>
					</>
				)}
			</div>
		</div>
	);
}

export default Integrations;
