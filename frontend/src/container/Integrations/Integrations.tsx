import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import logEvent from 'api/common/logEvent';
import CloudIntegration from 'container/Integrations/CloudIntegration/CloudIntegration';
import useUrlQuery from 'hooks/useUrlQuery';
import { IntegrationsProps } from 'types/api/integrations/types';

import { INTEGRATION_TELEMETRY_EVENTS, INTEGRATION_TYPES } from './constants';
// import IntegrationDetailPage from './IntegrationDetailPage/IntegrationDetailPage';
import IntegrationsHeader from './IntegrationsHeader/IntegrationsHeader';
import IntegrationsList from './IntegrationsList/IntegrationsList';
import OneClickIntegrations from './OneClickIntegrations/OneClickIntegrations';
import { IntegrationType } from './types';

import './Integrations.styles.scss';

function Integrations(): JSX.Element {
	const urlQuery = useUrlQuery();
	const history = useHistory();
	const location = useLocation();

	const selectedIntegration = useMemo(() => urlQuery.get('integration'), [
		urlQuery,
	]);

	const setSelectedIntegration = useCallback(
		(integration: IntegrationsProps | null) => {
			if (integration) {
				logEvent(INTEGRATION_TELEMETRY_EVENTS.INTEGRATIONS_ITEM_LIST_CLICKED, {
					integration,
				});
				urlQuery.set('integration', integration.id);
			} else {
				urlQuery.delete('integration');
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

	if (selectedIntegration === INTEGRATION_TYPES.AWS_INTEGRATION) {
		return <CloudIntegration type={IntegrationType.AWS_SERVICES} />;
	}

	if (selectedIntegration === INTEGRATION_TYPES.AZURE_INTEGRATION) {
		return <CloudIntegration type={IntegrationType.AZURE_SERVICES} />;
	}

	return (
		<div className="integrations-page">
			<div className="integrations-content">
				{/* {selectedIntegration && activeDetailTab ? (
					<IntegrationDetailPage
						selectedIntegration={selectedIntegration}
						setSelectedIntegration={setSelectedIntegration}
						activeDetailTab={activeDetailTab}
						setActiveDetailTab={setActiveDetailTab}
					/>
				) : ( */}
				<div className="integrations-listing-container">
					<IntegrationsHeader />
					<OneClickIntegrations
						setSelectedIntegration={setSelectedIntegration}
						setActiveDetailTab={setActiveDetailTab}
					/>
					<IntegrationsList
						setSelectedIntegration={setSelectedIntegration}
						setActiveDetailTab={setActiveDetailTab}
					/>
				</div>
				{/* )} */}
			</div>
		</div>
	);
}

export default Integrations;
