import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { useSignalFieldApis } from 'components/QuickFilters/hooks/useSignalFieldApis';
import { QuickFiltersSource, SignalType } from 'components/QuickFilters/types';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';

import DomainList from './Domains/DomainList';

import './Explorer.styles.scss';

function Explorer(): JSX.Element {
	const quickFilterFieldApis = useSignalFieldApis(
		TelemetrytypesSignalDTO.traces,
	);

	useEffect(() => {
		logEvent('API Monitoring: Landing page visited', {});
	}, []);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className={cx('api-monitoring-page', 'filter-visible')}>
				<section className="api-quick-filter-left-section">
					<QuickFilters
						className="qf-api-monitoring"
						pageSource={QuickFiltersSource.API_MONITORING}
						quickFilterSignal={SignalType.API_MONITORING}
						showFilterCollapse={false}
						showQueryName={false}
						handleFilterVisibilityChange={(): void => {}}
						useFieldApis={quickFilterFieldApis}
					/>
				</section>
				<DomainList />
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
