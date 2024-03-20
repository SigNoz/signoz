import './Integrations.styles.scss';

import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import Header from './Header';
import IntegrationDetailPage from './IntegrationDetailPage/IntegrationDetailPage';
import IntegrationsList from './IntegrationsList';

function Integrations(): JSX.Element {
	const urlQuery = useUrlQuery();
	const history = useHistory();
	const location = useLocation();

	const selectedIntegration = useMemo(() => urlQuery.get('integration'), [
		urlQuery,
	]);

	const setSelectedIntegration = useCallback(
		(integration: string | null) => {
			console.log(integration);
			if (integration) {
				urlQuery.set('integration', integration);
			} else {
				urlQuery.set('integration', '');
			}
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);
		},
		[history, location.pathname, urlQuery],
	);

	const [activeDetailTab, setActiveDetailTab] = useState<string | null>(null);

	const [searchTerm, setSearchTerm] = useState<string>('');
	return (
		<div className="integrations-container">
			<div className="integrations-content">
				{selectedIntegration && activeDetailTab ? (
					<IntegrationDetailPage
						selectedIntegration={selectedIntegration}
						setSelectedIntegration={setSelectedIntegration}
						activeDetailTab={activeDetailTab}
					/>
				) : (
					<>
						<Header setSearchTerm={setSearchTerm} searchTerm={searchTerm} />
						<IntegrationsList
							setSelectedIntegration={setSelectedIntegration}
							searchTerm={searchTerm}
							setActiveDetailTab={setActiveDetailTab}
						/>
					</>
				)}
			</div>
		</div>
	);
}

export default Integrations;
