import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import * as Sentry from '@sentry/react';
import { Button, Tooltip } from 'antd';
import logEvent from 'api/common/logEvent';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import QuickFiltersLayout from 'components/QuickFilters/QuickFiltersLayout/QuickFiltersLayout';
import { useSignalFieldApis } from 'components/QuickFilters/hooks/useSignalFieldApis';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import { initialQueryMeterWithType, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { Filter } from '@signozhq/icons';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { DataSource } from 'types/common/queryBuilder';

import { MeterExplorerEventKeys, MeterExplorerEvents } from '../events';
import TimeSeries from './TimeSeries';

import './Explorer.styles.scss';

function Explorer(): JSX.Element {
	const quickFilterFieldApis = useSignalFieldApis();
	const { handleRunQuery, updateAllQueriesOperators } = useQueryBuilder();
	const queryClient = useQueryClient();
	const [isLoadingQueries, setIsLoadingQueries] = useState(false);
	const [isCancelled, setIsCancelled] = useState(false);

	useEffect(() => {
		if (isLoadingQueries) {
			setIsCancelled(false);
		}
	}, [isLoadingQueries]);

	const handleCancelQuery = useCallback(() => {
		queryClient.cancelQueries([REACT_QUERY_KEY.GET_QUERY_RANGE]);
		setIsCancelled(true);
	}, [queryClient]);

	const [showQuickFilters, setShowQuickFilters] = useState(true);

	const defaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueryMeterWithType,
				PANEL_TYPES.BAR,
				DataSource.METRICS,
				'meter' as 'meter' | '',
			),
		[updateAllQueriesOperators],
	);

	useShareBuilderUrl({ defaultValue: defaultQuery });

	useEffect(() => {
		logEvent(MeterExplorerEvents.TabChanged, {
			[MeterExplorerEventKeys.Tab]: 'explorer',
		});
	}, []);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<QuickFiltersLayout
				className="meter-explorer-container"
				showFilters={showQuickFilters}
				onToggleFilters={(): void => setShowQuickFilters(!showQuickFilters)}
				savedViewProps={{ source: SavedviewtypesSourceDTO.meter }}
				quickFilterProps={{
					className: 'qf-meter-explorer',
					quickFilterSource: QuickFiltersSource.METER_EXPLORER,
					showFilterCollapse: true,
					showQueryName: false,
					useFieldApis: quickFilterFieldApis,
				}}
			>
				<div className="meter-explorer-content-section">
					<div className="meter-explorer-explore-content">
						<div className="explore-header">
							<div className="explore-header-left-actions">
								{!showQuickFilters && (
									<Tooltip title="Show Quick Filters" placement="right" arrow={false}>
										<Button
											className="periscope-btn outline"
											icon={<Filter size={16} />}
											onClick={(): void => setShowQuickFilters(!showQuickFilters)}
										/>
									</Tooltip>
								)}
							</div>

							<div className="explore-header-right-actions">
								<DateTimeSelector showAutoRefresh />
								<RightToolbarActions
									onStageRunQuery={(): void => handleRunQuery()}
									isLoadingQueries={isLoadingQueries}
									handleCancelQuery={handleCancelQuery}
								/>
							</div>
						</div>
						<QueryBuilderV2
							config={{
								initialDataSource: DataSource.METRICS,
								queryVariant: 'static',
								signalSource: 'meter',
							}}
							panelType={PANEL_TYPES.TIME_SERIES}
							showFunctions={false}
							version="v3"
						/>

						<div className="explore-content">
							<TimeSeries
								onFetchingStateChange={setIsLoadingQueries}
								isCancelled={isCancelled}
							/>
						</div>
					</div>
				</div>
			</QuickFiltersLayout>
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
