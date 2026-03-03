import { useMemo } from 'react';
import { Badge } from '@signozhq/badge';
import { IntegrationsProps } from 'types/api/integrations/types';

import { ONE_CLICK_INTEGRATIONS } from '../constants';

import './OneClickIntegrations.styles.scss';

interface OneClickIntegrationsProps {
	searchQuery: string;
	setSelectedIntegration: (integration: IntegrationsProps) => void;
}

function OneClickIntegrations(props: OneClickIntegrationsProps): JSX.Element {
	const { searchQuery, setSelectedIntegration } = props;

	const filteredIntegrations = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) {
			return ONE_CLICK_INTEGRATIONS;
		}
		return ONE_CLICK_INTEGRATIONS.filter(
			(integration) =>
				integration.title.toLowerCase().includes(query) ||
				integration.description.toLowerCase().includes(query),
		);
	}, [searchQuery]);

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
				{filteredIntegrations.length === 0 && searchQuery.trim() ? (
					<div className="integrations-not-found-container">
						<div className="integrations-not-found-content">
							<img
								src="/Icons/awwSnap.svg"
								alt="no-integrations"
								className="integrations-not-found-image"
							/>
							<div className="integrations-not-found-text">
								No integrations found for &ldquo;{searchQuery.trim()}&rdquo;
							</div>
						</div>
					</div>
				) : (
					<>
						{filteredIntegrations.map((integration) => (
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
					</>
				)}
			</div>
		</div>
	);
}

export default OneClickIntegrations;
