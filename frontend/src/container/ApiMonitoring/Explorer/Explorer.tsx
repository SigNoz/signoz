import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource, SignalType } from 'components/QuickFilters/types';
import { LOCALSTORAGE } from 'constants/localStorage';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { ResizableBox } from 'periscope/components/ResizableBox';
import usePanelWidth from 'periscope/components/ResizableBox/usePanelWidth';

import DomainList from './Domains/DomainList';

import './Explorer.styles.scss';

const QUICK_FILTERS_DEFAULT_WIDTH = 260;
const QUICK_FILTERS_MIN_WIDTH = 240;
const QUICK_FILTERS_MAX_WIDTH = 500;

function Explorer(): JSX.Element {
	useEffect(() => {
		logEvent('API Monitoring: Landing page visited', {});
	}, []);

	const {
		initialWidth: quickFiltersInitialWidth,
		persistWidth: persistQuickFiltersWidth,
	} = usePanelWidth({
		storageKey: LOCALSTORAGE.QUICK_FILTERS_WIDTH_API_MONITORING,
		defaultWidth: QUICK_FILTERS_DEFAULT_WIDTH,
		minWidth: QUICK_FILTERS_MIN_WIDTH,
		maxWidth: QUICK_FILTERS_MAX_WIDTH,
	});

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className={cx('api-monitoring-page', 'filter-visible')}>
				<ResizableBox
					handle="right"
					defaultWidth={QUICK_FILTERS_DEFAULT_WIDTH}
					initialWidth={quickFiltersInitialWidth}
					minWidth={QUICK_FILTERS_MIN_WIDTH}
					maxWidth={QUICK_FILTERS_MAX_WIDTH}
					onResize={persistQuickFiltersWidth}
					resetToDefaultOnDoubleClick
					withHandle
					className="api-quick-filter-left-section"
					handleTestId="quick-filters-resize-handle"
				>
					<QuickFilters
						className="qf-api-monitoring"
						source={QuickFiltersSource.API_MONITORING}
						signal={SignalType.API_MONITORING}
						showFilterCollapse={false}
						showQueryName={false}
						handleFilterVisibilityChange={(): void => {}}
					/>
				</ResizableBox>
				<DomainList />
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
