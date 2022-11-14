import { Menu, Space } from 'antd';
import Spinner from 'components/Spinner';
import React, { Suspense, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ConfigProps } from 'types/api/dynamicConfigs/getDynamicConfigs';
import AppReducer from 'types/reducer/app';

import ErrorLink from './ErrorLink';
import LinkContainer from './Link';

function HelpToolTip({ config }: HelpToolTipProps): JSX.Element {
	const sortedConfig = useMemo(
		() => config.components.sort((a, b) => a.position - b.position),
		[config.components],
	);

	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);

	return (
		<Menu.ItemGroup>
			{sortedConfig.map((item) => {
				const iconName = `${isDarkMode ? item.darkIcon : item.lightIcon}`;

				const Component = React.lazy(
					() => import(`@ant-design/icons/es/icons/${iconName}.js`),
				);
				return (
					<ErrorLink key={item.text + item.href}>
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
