import './MetricsApplication.styles.scss';

import { Tabs, TabsProps } from 'antd/lib';
import { QueryParams } from 'constants/query';
import DBCall from 'container/MetricsApplication/Tabs/DBCall';
import External from 'container/MetricsApplication/Tabs/External';
import Overview from 'container/MetricsApplication/Tabs/Overview';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { useParams } from 'react-router-dom';

import ApDexApplication from './ApDex/ApDexApplication';
import { MetricsApplicationTab, TAB_KEY_VS_LABEL } from './types';
import useMetricsApplicationTabKey from './useMetricsApplicationTabKey';

function MetricsApplication(): JSX.Element {
	const { servicename: encodedServiceName } = useParams<{
		servicename: string;
	}>();

	const activeKey = useMetricsApplicationTabKey();

	const urlQuery = useUrlQuery();
	const { safeNavigate } = useSafeNavigate();

	const items: TabsProps['items'] = [
		{
			label: TAB_KEY_VS_LABEL[MetricsApplicationTab.OVER_METRICS],
			key: MetricsApplicationTab.OVER_METRICS,
			children: <Overview />,
		},
		{
			label: TAB_KEY_VS_LABEL[MetricsApplicationTab.DB_CALL_METRICS],
			key: MetricsApplicationTab.DB_CALL_METRICS,
			children: <DBCall />,
		},
		{
			label: TAB_KEY_VS_LABEL[MetricsApplicationTab.EXTERNAL_METRICS],
			key: MetricsApplicationTab.EXTERNAL_METRICS,
			children: <External />,
		},
	];

	const onTabChange = (tab: string): void => {
		urlQuery.set(QueryParams.tab, tab);
		safeNavigate(`/services/${encodedServiceName}?${urlQuery.toString()}`);
	};

	return (
		<div className="metrics-application-container">
			<ResourceAttributesFilter />
			<ApDexApplication />
			<Tabs
				items={items}
				activeKey={activeKey}
				className="service-route-tab"
				destroyInactiveTabPane
				onChange={onTabChange}
			/>
		</div>
	);
}

export default MetricsApplication;
