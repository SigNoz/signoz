import { Tag } from 'antd';
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

							<div className="one-click-integrations-list-item-new-tag">
								<Tag bordered={false} color="geekblue">
									NEW
								</Tag>
							</div>
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
