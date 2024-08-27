import './alertDetails.styles.scss';

import { Breadcrumb, ConfigProvider, Divider } from 'antd';
import { Filters } from 'components/AlertDetailsFilters/Filters';
import RouteTab from 'components/RouteTab';
import Spinner from 'components/Spinner';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import AlertHeader from './AlertHeader/AlertHeader';
import { useGetAlertRuleDetails, useRouteTabUtils } from './hooks';
import { AlertDetailsStatusRendererProps } from './types';

function AlertDetailsStatusRenderer({
	isLoading,
	isError,
	isRefetching,
	data,
}: AlertDetailsStatusRendererProps): JSX.Element {
	const alertRuleDetails = useMemo(() => data?.payload?.data, [data]);
	const { t } = useTranslation('common');

	if (isLoading || isRefetching) {
		return <Spinner tip="Loading Rules Details..." />;
	}

	if (isError) {
		return <div>{data?.error || t('something_went_wrong')}</div>;
	}

	return <AlertHeader alertDetails={alertRuleDetails} />;
}

function AlertDetails(): JSX.Element {
	const { pathname } = useLocation();
	const { routes } = useRouteTabUtils();

	const {
		data: { isLoading, data, isRefetching, isError },
		ruleId,
	} = useGetAlertRuleDetails();

	return (
		<ConfigProvider
			theme={{
				components: {
					Tabs: {
						titleFontSize: 14,
						inkBarColor: 'none',
						itemColor: 'var(--bg-vanilla-400)',
						itemSelectedColor: 'var(--bg-vanilla-100)',
						itemHoverColor: 'var(--bg-vanilla-100)',
						horizontalItemGutter: 0,
					},
					Breadcrumb: {
						itemColor: 'var(--text-vanilla-400)',
						fontSize: 14,
						lastItemColor: 'var(--text-vanilla-100)',
					},
				},
			}}
		>
			<div className="alert-details">
				<Breadcrumb
					items={[
						{
							title: 'Alert Rules',
							href: ROUTES.LIST_ALL_ALERT,
						},
						{
							title: ruleId,
						},
					]}
				/>
				<Divider className="divider" />
				<AlertDetailsStatusRenderer
					{...{ isLoading, isError, isRefetching, data }}
				/>
				<Divider className="divider" />
				<div className="tabs-and-filters">
					<RouteTab
						routes={routes}
						activeKey={pathname}
						history={history}
						tabBarExtraContent={<Filters />}
					/>
				</div>
			</div>
		</ConfigProvider>
	);
}

export default AlertDetails;
