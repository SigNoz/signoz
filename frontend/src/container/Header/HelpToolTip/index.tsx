import { Menu } from 'antd';
import React from 'react';
import { ConfigProps } from 'types/api/dynamicConfigs/getDynamicConfigs';

function HelpToolTip({ config }: HelpToolTipProps): JSX.Element {
	// sort config components by position
	const sortedConfig = config.Components.sort((a, b) => a.Position - b.Position);
	return (
		<Menu.ItemGroup>
			{sortedConfig.map((item) => {
				return (
					<Menu.Item key={item.Text}>
						<a href={item.Href} target="_blank" rel="noreferrer">
							<img alt={item.Text} src={item.IconLink} />
							{item.Text}
						</a>
					</Menu.Item>
				);
			})}
		</Menu.ItemGroup>
	);
}

interface HelpToolTipProps {
	config: ConfigProps;
}

export default HelpToolTip;
