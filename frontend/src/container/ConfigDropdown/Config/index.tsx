import { Menu, Space } from 'antd';
import Spinner from 'components/Spinner';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { lazy, Suspense, useMemo } from 'react';
import { ConfigProps } from 'types/api/dynamicConfigs/getDynamicConfigs';
import { lazyRetry } from 'utils/lazyWithRetries';

import ErrorLink from './ErrorLink';
import LinkContainer from './Link';

function HelpToolTip({ config }: HelpToolTipProps): JSX.Element {
	const sortedConfig = useMemo(
		() => config.components.sort((a, b) => a.position - b.position),
		[config.components],
	);

	const isDarkMode = useIsDarkMode();

	const items = sortedConfig.map((item) => {
		const iconName = `${isDarkMode ? item.darkIcon : item.lightIcon}`;

		const Component = lazy(() =>
			lazyRetry(() => import(`@ant-design/icons/es/icons/${iconName}.js`)),
		);
		return {
			key: item.text + item.href,
			label: (
				<ErrorLink key={item.text + item.href}>
					<Suspense fallback={<Spinner height="5vh" />}>
						<LinkContainer href={item.href}>
							<Space size="small" align="start">
								<Component />
								{item.text}
							</Space>
						</LinkContainer>
					</Suspense>
				</ErrorLink>
			),
		};
	});

	return <Menu items={items} />;
}

interface HelpToolTipProps {
	config: ConfigProps;
}

export default HelpToolTip;
