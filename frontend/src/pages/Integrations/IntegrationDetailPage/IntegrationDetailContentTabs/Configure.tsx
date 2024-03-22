import './IntegrationDetailContentTabs.styles.scss';

import { Button, Typography } from 'antd';
import cx from 'classnames';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import { useState } from 'react';

interface ConfigurationProps {
	configuration: Array<{ title: string; instructions: string }>;
}

function Configure(props: ConfigurationProps): JSX.Element {
	// TODO Mardown renderer support once instructions are ready
	const { configuration } = props;
	const [selectedConfigStep, setSelectedConfigStep] = useState(0);

	const handleMenuClick = (index: number): void => {
		setSelectedConfigStep(index);
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
						onClick={(): void => handleMenuClick(index)}
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
				/>
			</div>
		</div>
	);
}

export default Configure;
