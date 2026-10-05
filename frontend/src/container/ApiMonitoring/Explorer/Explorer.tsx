import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import logEvent from 'api/common/logEvent';
import QuickFiltersLayout from 'components/QuickFilters/QuickFiltersLayout/QuickFiltersLayout';
import { useSignalFieldApis } from 'components/QuickFilters/hooks/useSignalFieldApis';
import { QuickFiltersSource, SignalType } from 'components/QuickFilters/types';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';

import DomainList from './Domains/DomainList';

import './Explorer.styles.scss';

function Explorer(): JSX.Element {
	const quickFilterFieldApis = useSignalFieldApis();

	useEffect(() => {
		logEvent('API Monitoring: Landing page visited', {});
	}, []);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<QuickFiltersLayout
				className="api-monitoring-explorer"
				showFilters
				quickFilterProps={{
					className: 'qf-api-monitoring',
					source: QuickFiltersSource.API_MONITORING,
					signal: SignalType.API_MONITORING,
					showFilterCollapse: false,
					showQueryName: false,
					handleFilterVisibilityChange: (): void => {},
					useFieldApis: quickFilterFieldApis,
				}}
			>
				<DomainList />
			</QuickFiltersLayout>
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
