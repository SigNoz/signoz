import { Badge } from '@signozhq/badge';
import { IntegrationsProps } from 'types/api/integrations/types';

import { ONE_CLICK_INTEGRATIONS } from '../constants';

import './OneClickIntegrations.styles.scss';

interface OneClickIntegrationsProps {
	setSelectedIntegration: (integration: IntegrationsProps) => void;
}

function OneClickIntegrations(props: OneClickIntegrationsProps): JSX.Element {
	const { setSelectedIntegration } = props;

	const handleSelectedIntegration = (integration: IntegrationsProps): void => {
		setSelectedIntegration(integration);
	};

	return (
		<div className="one-click-integrations">
			<div className="one-click-integrations-header">
				<div className="one-click-integrations-header-title">
					One Click Integrations
				</div>

				<div className="one-click-integrations-header-dotted-double-line">
					<img
						src="/svgs/dotted-double-line.svg"
						alt="dotted-double-line"
						width="100%"
						height="100%"
					/>
				</div>
			</div>

			<div className="one-click-integrations-list">
				{ONE_CLICK_INTEGRATIONS.map((integration) => (
					<div
						className="one-click-integrations-list-item"
						key={integration.id}
						onClick={(): void => handleSelectedIntegration(integration)}
					>
						<div className="one-click-integrations-list-item-title">
							<div className="one-click-integrations-list-item-title-image-container">
								<img src={integration.icon} alt={integration.title} />
								<div className="one-click-integrations-list-item-title-text">
									{integration.title}
								</div>
							</div>
							{integration.is_new && (
								<div className="one-click-integrations-list-item-new-tag">
									<Badge color="robin" variant="default">
										NEW
									</Badge>
								</div>
							)}
						</div>

						<div className="one-click-integrations-list-item-description">
							{integration.description}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default OneClickIntegrations;
