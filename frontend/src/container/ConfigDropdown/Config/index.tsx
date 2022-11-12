import { Menu, Space } from 'antd';
import Spinner from 'components/Spinner';
import React, { Suspense, useMemo } from 'react';
import { ConfigProps } from 'types/api/dynamicConfigs/getDynamicConfigs';

import ErrorLink from './ErrorLink';
import LinkContainer from './Link';

function HelpToolTip({ config }: HelpToolTipProps): JSX.Element {
	const sortedConfig = useMemo(
		() => config.components.sort((a, b) => a.position - b.position),
		[config.components],
	);

	return (
		<Menu.ItemGroup>
			{sortedConfig.map((item) => {
				const Component = React.lazy(
					() => import(`@ant-design/icons/es/icons/${item.iconLink}.js`),
				);
				return (
					<ErrorLink key={item.text}>
						<Suspense fallback={<Spinner height="5vh" />}>
							<Menu.Item>
								<LinkContainer href={item.href}>
									<Space size="small" align="start">
										<Component />
										{item.text}
									</Space>
								</LinkContainer>
							</Menu.Item>
						</Suspense>
					</ErrorLink>
				);
			})}
		</Menu.ItemGroup>
	);
}

interface HelpToolTipProps {
	config: ConfigProps;
}

export default HelpToolTip;
