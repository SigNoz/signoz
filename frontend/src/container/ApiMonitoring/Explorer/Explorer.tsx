import './Explorer.styles.scss';

import * as Sentry from '@sentry/react';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useEffect } from 'react';

import { ApiMonitoringQuickFiltersConfig } from '../utils';
import DomainList from './Domains/DomainList';

function Explorer(): JSX.Element {
	useEffect(() => {
		logEvent('API Monitoring: Landing page visited', {});
	}, []);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className={cx('api-monitoring-page', 'filter-visible')}>
				<section className="api-quick-filter-left-section">
					<QuickFilters
						source={QuickFiltersSource.API_MONITORING}
						config={ApiMonitoringQuickFiltersConfig}
						showFilterCollapse={false}
						handleFilterVisibilityChange={(): void => {}}
					/>
				</section>
				<DomainList />
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
