import { Spinner } from '@signozhq/ui/spinner';
import { Tabs } from '@signozhq/ui/tabs';
import { useAppParams } from 'lib/router/useAppParams';

import ApdexSettings from './components/ApdexSettings/ApdexSettings';
import ServiceBreadcrumbs from './components/ServiceBreadcrumbs/ServiceBreadcrumbs';
import ServiceDashboard from './components/ServiceDashboard/ServiceDashboard';
import { useServiceDashboardVariables } from './hooks/useServiceDashboardVariables';
import { useServiceDetailsTab } from './hooks/useServiceDetailsTab';
import { SERVICE_DETAILS_TABS } from './serviceDetailsTabs';

import styles from './ServiceDetails.module.scss';

/** One service's Overview, DB calls and External calls, each a read-only system dashboard. */
function ServiceDetails(): JSX.Element {
	const { servicename } = useAppParams<'servicename'>();
	const serviceName = decodeURIComponent(servicename ?? '');
	const [activeTab, setActiveTab] = useServiceDetailsTab();
	const { variables, isLoading } = useServiceDashboardVariables(serviceName);

	const items = SERVICE_DETAILS_TABS.map((tab) => ({
		key: tab.key,
		label: tab.label,
		children:
			tab.key !== activeTab || isLoading ? null : (
				<ServiceDashboard
					// The dashboard reads its seed once, so new values need a fresh mount.
					key={JSON.stringify(variables)}
					tab={tab}
					serviceName={serviceName}
					variables={variables}
				/>
			),
	}));

	return (
		<div className={styles.page} data-testid="service-details">
			<header className={styles.header}>
				<ServiceBreadcrumbs serviceName={serviceName} />
				<ApdexSettings serviceName={serviceName} />
			</header>
			{isLoading ? (
				<div className={styles.loading}>
					<Spinner size={24} aria-label="Loading service" />
				</div>
			) : (
				<Tabs
					variant="primary"
					orientation="horizontal"
					alignment="start"
					value={activeTab}
					onChange={(key): void => setActiveTab(key as typeof activeTab)}
					items={items}
					className={styles.tabs}
					testId="service-details-tabs"
				/>
			)}
		</div>
	);
}

export default ServiceDetails;
