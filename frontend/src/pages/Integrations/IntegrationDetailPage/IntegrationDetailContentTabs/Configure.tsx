import './IntegrationDetailContentTabs.styles.scss';

import { Button, Tooltip, Typography } from 'antd';
import cx from 'classnames';
import { useState } from 'react';

function Configure(): JSX.Element {
	const [selectedConfigStep, setSelectedConfigStep] = useState(0);

	const handleMenuClick = (index: number): void => {
		setSelectedConfigStep(index);
	};

	const configuration = [
		{
			title: 'Install Otel Collector',
			instructions: '<markdown1>',
		},
		{
			title: 'Configure Nginx Receiver',
			instructions: '<markdown2>',
		},
	];
	return (
		<div className="integration-detail-configure">
			<div className="configure-menu">
				{configuration.map((config, index) => (
					<Tooltip title={config.title} key={config.title}>
						<Button
							key={config.title}
							type="text"
							className={cx('configure-menu-item', {
								active: selectedConfigStep === index,
							})}
							onClick={(): void => handleMenuClick(index)}
						>
							<Typography.Text ellipsis>{config.title}</Typography.Text>
						</Button>
					</Tooltip>
				))}
			</div>
			<div className="markdown-container">
				{configuration[selectedConfigStep].instructions}
			</div>
		</div>
	);
}

export default Configure;
