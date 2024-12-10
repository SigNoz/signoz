import './InfraMonitoringK8s.styles.scss';

import * as Sentry from '@sentry/react';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useState } from 'react';

import K8sPodLists from './Pods/K8sPodLists';
import { K8sQuickFiltersConfig } from './utils';

export default function InfraMonitoringK8s(): JSX.Element {
	const [showFilters, setShowFilters] = useState(true);

	const handleFilterVisibilityChange = (): void => {
		setShowFilters(!showFilters);
	};

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="infra-monitoring-container">
				<div className="k8s-container">
					{showFilters && (
						<div className="k8s-quick-filters-container">
							<QuickFilters
								source="infra-monitoring"
								config={K8sQuickFiltersConfig}
								handleFilterVisibilityChange={handleFilterVisibilityChange}
							/>
						</div>
					)}

					<div
						className={`k8s-list-container ${
							showFilters ? 'k8s-list-container-filters-visible' : ''
						}`}
					>
						<K8sPodLists
							isFiltersVisible={showFilters}
							handleFilterVisibilityChange={handleFilterVisibilityChange}
						/>
					</div>
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}
