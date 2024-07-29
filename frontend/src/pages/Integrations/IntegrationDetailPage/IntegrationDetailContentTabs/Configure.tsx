import './IntegrationDetailContentTabs.styles.scss';

import { Button, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import { INTEGRATION_TELEMETRY_EVENTS } from 'pages/Integrations/utils';
import { useEffect, useState } from 'react';

interface ConfigurationProps {
	configuration: Array<{ title: string; instructions: string }>;
	integrationId: string;
}

function Configure(props: ConfigurationProps): JSX.Element {
	// TODO Mardown renderer support once instructions are ready
	const { configuration, integrationId } = props;
	const [selectedConfigStep, setSelectedConfigStep] = useState(0);

	const handleMenuClick = (index: number, config: any): void => {
		setSelectedConfigStep(index);
		logEvent('Integrations Detail Page: Configure tab', {
			sectionName: config?.title,
			integrationId,
		});
	};

	useEffect(() => {
		logEvent(
			INTEGRATION_TELEMETRY_EVENTS.INTEGRATIONS_DETAIL_CONFIGURE_INSTRUCTION,
			{
				integration: integrationId,
			},
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const markdownDetailsForTracking = {
		trackingTitle: `Integrations Detail Page: Copy button`,
		sectionName: configuration[selectedConfigStep].title,
		integrationId,
	};

	return (
		<div className="integration-detail-configure">
			<div className="configure-menu">
				{configuration.map((config, index) => (
					<Button
						key={config.title}
						type="text"
						className={cx('configure-menu-item', {
							active: selectedConfigStep === index,
						})}
						onClick={(): void => handleMenuClick(index, config)}
					>
						<Typography.Text className="configure-text">
							{config.title}
						</Typography.Text>
					</Button>
				))}
			</div>
			<div className="markdown-container">
				<MarkdownRenderer
					variables={{}}
					markdownContent={configuration[selectedConfigStep].instructions}
					elementDetails={markdownDetailsForTracking}
					trackCopyAction
				/>
			</div>
		</div>
	);
}

export default Configure;
