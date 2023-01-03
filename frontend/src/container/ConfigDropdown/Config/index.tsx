import { Menu, Space } from 'antd';
import Spinner from 'components/Spinner';
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { Suspense, useMemo } from 'react';
import { ConfigProps } from 'types/api/dynamicConfigs/getDynamicConfigs';

import ErrorLink from './ErrorLink';
import LinkContainer from './Link';
import { MenuItem } from './styles';

function HelpToolTip({ config }: HelpToolTipProps): JSX.Element {
	const sortedConfig = useMemo(
		() => config.components.sort((a, b) => a.position - b.position),
		[config.components],
	);

	const isDarkMode = useIsDarkMode();

	return (
		<Menu>
			{sortedConfig.map((item) => {
				const iconName = `${isDarkMode ? item.darkIcon : item.lightIcon}`;

				const Component = React.lazy(
					() => import(`@ant-design/icons/es/icons/${iconName}.js`),
				);
				return (
					<ErrorLink key={item.text + item.href}>
						<Suspense fallback={<Spinner height="5vh" />}>
							<MenuItem>
								<LinkContainer href={item.href}>
									<Space size="small" align="start">
										<Component />
										{item.text}
									</Space>
								</LinkContainer>
							</MenuItem>
						</Suspense>
					</ErrorLink>
				);
			})}
		</Menu>
	);
}

interface HelpToolTipProps {
	config: ConfigProps;
}

export default HelpToolTip;
