import { Menu } from 'antd';
import Spinner from 'components/Spinner';
import React, { Suspense } from 'react';
import { ConfigProps } from 'types/api/dynamicConfigs/getDynamicConfigs';

function HelpToolTip({ config }: HelpToolTipProps): JSX.Element {
	const sortedConfig = config.Components.sort((a, b) => a.Position - b.Position);
	return (
		<Menu.ItemGroup>
			{sortedConfig.map((item) => {
				const iconsName = 'FastForwardOutlined';
				const Component = React.lazy(
					() => import(`@ant-design/icons/${iconsName}`),
				);

				return (
					<Suspense key={item.Text} fallback={<Spinner height="5vh" />}>
						<Menu.Item>
							<a href={item.Href} target="_blank" rel="noreferrer">
								<Component />
								{item.Text}
							</a>
						</Menu.Item>
					</Suspense>
				);
			})}
		</Menu.ItemGroup>
	);
}

interface HelpToolTipProps {
	config: ConfigProps;
}

export default HelpToolTip;
