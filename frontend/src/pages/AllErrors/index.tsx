import { useCallback, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useLocation } from 'react-router-dom';
import { Filter } from '@signozhq/icons';
import { Button, Tooltip } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import cx from 'classnames';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource, SignalType } from 'components/QuickFilters/types';
import RouteTab from 'components/RouteTab';
import TypicalOverlayScrollbar from 'components/TypicalOverlayScrollbar/TypicalOverlayScrollbar';
import { LOCALSTORAGE } from 'constants/localStorage';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import ResourceAttributesFilterV2 from 'container/ResourceAttributeFilterV2/ResourceAttributesFilterV2';
import Toolbar from 'container/Toolbar/Toolbar';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import history from 'lib/history';
import { isNull } from 'lodash-es';
import { ResizableBox } from 'periscope/components/ResizableBox';
import usePanelWidth from 'periscope/components/ResizableBox/usePanelWidth';

import { routes } from './config';
import { useAllErrorsQueryState } from './QueryStateContext';

import './AllErrors.styles.scss';

const QUICK_FILTERS_DEFAULT_WIDTH = 260;
const QUICK_FILTERS_MIN_WIDTH = 240;
const QUICK_FILTERS_MAX_WIDTH = 500;

function AllErrors(): JSX.Element {
	const { pathname } = useLocation();
	const { handleRunQuery } = useQueryBuilder();
	const queryClient = useQueryClient();

	const isLoadingQueries = useAllErrorsQueryState((s) => s.isFetching);
	const setIsCancelled = useAllErrorsQueryState((s) => s.setIsCancelled);
	const handleCancelQuery = useCallback(() => {
		queryClient.cancelQueries(['getAllErrors']);
		queryClient.cancelQueries(['getErrorCounts']);
		setIsCancelled(true);
	}, [queryClient, setIsCancelled]);

	const [showFilters, setShowFilters] = useState<boolean>(() => {
		const localStorageValue = getLocalStorageKey(
			LOCALSTORAGE.SHOW_EXCEPTIONS_QUICK_FILTERS,
		);
		if (!isNull(localStorageValue)) {
			return localStorageValue === 'true';
		}
		return true;
	});

	const handleFilterVisibilityChange = (): void => {
		setLocalStorageApi(
			LOCALSTORAGE.SHOW_EXCEPTIONS_QUICK_FILTERS,
			String(!showFilters),
		);
		setShowFilters((prev) => !prev);
	};

	const {
		initialWidth: quickFiltersInitialWidth,
		persistWidth: persistQuickFiltersWidth,
	} = usePanelWidth({
		storageKey: LOCALSTORAGE.QUICK_FILTERS_WIDTH_EXCEPTIONS,
		defaultWidth: QUICK_FILTERS_DEFAULT_WIDTH,
		minWidth: QUICK_FILTERS_MIN_WIDTH,
		maxWidth: QUICK_FILTERS_MAX_WIDTH,
	});

	return (
		<div className={cx('all-errors-page', showFilters ? 'filter-visible' : '')}>
			{showFilters && (
				<ResizableBox
					handle="right"
					defaultWidth={QUICK_FILTERS_DEFAULT_WIDTH}
					initialWidth={quickFiltersInitialWidth}
					minWidth={QUICK_FILTERS_MIN_WIDTH}
					maxWidth={QUICK_FILTERS_MAX_WIDTH}
					onResize={persistQuickFiltersWidth}
					resetToDefaultOnDoubleClick
					withHandle
					className="all-errors-quick-filter-section"
					handleTestId="quick-filters-resize-handle"
				>
					<QuickFilters
						className="qf-exceptions"
						source={QuickFiltersSource.EXCEPTIONS}
						signal={SignalType.EXCEPTIONS}
						handleFilterVisibilityChange={handleFilterVisibilityChange}
					/>
				</ResizableBox>
			)}
			<section
				className={cx(
					'all-errors-right-section',
					showFilters ? 'filter-visible' : '',
				)}
			>
				<TypicalOverlayScrollbar>
					<>
						<Toolbar
							showAutoRefresh={false}
							leftActions={
								!showFilters ? (
									<Tooltip title="Show Filters">
										<Button onClick={handleFilterVisibilityChange} className="filter-btn">
											<Filter size="md" />
										</Button>
									</Tooltip>
								) : undefined
							}
							rightActions={
								<div className="right-toolbar-actions-container">
									<RightToolbarActions
										onStageRunQuery={handleRunQuery}
										isLoadingQueries={isLoadingQueries}
										handleCancelQuery={handleCancelQuery}
									/>
									<HeaderRightSection
										enableAnnouncements={false}
										enableShare
										enableFeedback
									/>
								</div>
							}
						/>
						<ResourceAttributesFilterV2 />
						<RouteTab
							routes={routes}
							activeKey={pathname}
							history={history}
							showRightSection={false}
						/>
					</>
				</TypicalOverlayScrollbar>
			</section>
		</div>
	);
}

export default AllErrors;
