import { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import { IntegrationsProps } from 'types/api/integrations/types';

import { INTEGRATION_TELEMETRY_EVENTS } from './constants';
import IntegrationsHeader from './IntegrationsHeader/IntegrationsHeader';
import IntegrationsList from './IntegrationsList/IntegrationsList';
import OneClickIntegrations from './OneClickIntegrations/OneClickIntegrations';

import './Integrations.styles.scss';

function Integrations(): JSX.Element {
	const history = useHistory();

	const setSelectedIntegration = useCallback(
		(integration: IntegrationsProps | null) => {
			if (integration) {
				logEvent(INTEGRATION_TELEMETRY_EVENTS.INTEGRATIONS_ITEM_LIST_CLICKED, {
					integration,
				});
				history.push(`${ROUTES.INTEGRATIONS}/${integration.id}`);
			} else {
				history.push(ROUTES.INTEGRATIONS);
			}
		},
		[history],
	);

	useEffect(() => {
		logEvent(INTEGRATION_TELEMETRY_EVENTS.INTEGRATIONS_LIST_VISITED, {});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="integrations-page">
			<div className="integrations-content">
				<div className="integrations-listing-container">
					<IntegrationsHeader />
					<OneClickIntegrations setSelectedIntegration={setSelectedIntegration} />
					<IntegrationsList setSelectedIntegration={setSelectedIntegration} />
				</div>
			</div>
		</div>
	);
}

export default Integrations;
