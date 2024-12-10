import './InfraMonitoringK8s.styles.scss';

import * as Sentry from '@sentry/react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';

import K8sPodLists from './Pods/K8sPodLists';

export default function InfraMonitoringK8s(): JSX.Element {
	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="infra-monitoring-container">
				<div className="k8s-container">
					{/* <div className="k8s-quick-filters-container">
						<QuickFilters
							config={K8sQuickFiltersConfig}
							handleFilterVisibilityChange={(): void => {
								console.log('filter visibility changed');
							}}
						/>
					</div> */}

					<div className="k8s-list-container">
						<K8sPodLists />
					</div>
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}
