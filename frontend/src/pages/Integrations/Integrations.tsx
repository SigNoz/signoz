import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import logEvent from 'api/common/logEvent';
import useUrlQuery from 'hooks/useUrlQuery';

import Header from './Header';
import IntegrationDetailPage from './IntegrationDetailPage/IntegrationDetailPage';
import IntegrationsList from './IntegrationsList';
import { INTEGRATION_TELEMETRY_EVENTS } from './utils';

import './Integrations.styles.scss';

function Integrations(): JSX.Element {
	const urlQuery = useUrlQuery();
	const history = useHistory();
	const location = useLocation();

	const selectedIntegration = useMemo(() => urlQuery.get('integration'), [
		urlQuery,
	]);

	const setSelectedIntegration = useCallback(
		(integration: string | null) => {
			if (integration) {
				logEvent(INTEGRATION_TELEMETRY_EVENTS.INTEGRATIONS_ITEM_LIST_CLICKED, {
					integration,
				});
				urlQuery.set('integration', integration);
			} else {
				urlQuery.set('integration', '');
			}
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);
		},
		[history, location.pathname, urlQuery],
	);

	const [activeDetailTab, setActiveDetailTab] = useState<string | null>(
		'overview',
	);

	useEffect(() => {
		logEvent(INTEGRATION_TELEMETRY_EVENTS.INTEGRATIONS_LIST_VISITED, {});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="integrations-container">
			<div className="integrations-content">
				{selectedIntegration && activeDetailTab ? (
					<IntegrationDetailPage
						selectedIntegration={selectedIntegration}
						setSelectedIntegration={setSelectedIntegration}
						activeDetailTab={activeDetailTab}
						setActiveDetailTab={setActiveDetailTab}
					/>
				) : (
					<>
						<Header />
						<IntegrationsList
							setSelectedIntegration={setSelectedIntegration}
							setActiveDetailTab={setActiveDetailTab}
						/>
					</>
				)}
			</div>
		</div>
	);
}

export default Integrations;
