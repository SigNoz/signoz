import './alertDetails.styles.scss';

import { ConfigProvider } from 'antd';
import { Filters } from 'components/AlertDetailsFilters/Filters';
import RouteTab from 'components/RouteTab';
import history from 'lib/history';
import { useLocation } from 'react-router-dom';

import { useRouteTabUtils } from './hooks';

function AlertDetails(): JSX.Element {
	const { pathname } = useLocation();

	const { routes } = useRouteTabUtils();

	return (
		<div className="tabs-and-filters">
			<ConfigProvider
				theme={{
					components: {
						Tabs: {
							titleFontSize: 14,
							inkBarColor: 'none',
							itemColor: 'var(--vanilla-400, #C0C1C3)',
							itemSelectedColor: 'var(--Vanilla-100, #FFF)',
							itemHoverColor: 'var(--Vanilla-100, #FFF)',
							horizontalItemGutter: 0,
						},
					},
				}}
			>
				<RouteTab
					routes={routes}
					activeKey={pathname}
					history={history}
					tabBarExtraContent={<Filters />}
				/>
			</ConfigProvider>
		</div>
	);
}

export default AlertDetails;
