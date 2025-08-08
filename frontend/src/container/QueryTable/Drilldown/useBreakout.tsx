import { QueryParams } from 'constants/query';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ArrowLeft } from 'lucide-react';
import ContextMenu from 'periscope/components/ContextMenu';
import { useCallback, useMemo } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import BreakoutOptions from './BreakoutOptions';
import { getQueryData } from './drilldownUtils';
import { getBreakoutQuery } from './tableDrilldownUtils';
import { AggregateData } from './useAggregateDrilldown';

interface UseBreakoutProps {
	query: Query;
	widgetId: string;
	onClose: () => void;
	aggregateData: AggregateData | null;
	setSubMenu: (subMenu: string) => void;
}

interface BreakoutConfig {
	header?: string | React.ReactNode;
	items?: React.ReactNode;
}

const useBreakout = ({
	query,
	widgetId,
	onClose,
	aggregateData,
	setSubMenu,
}: UseBreakoutProps): {
	breakoutConfig: BreakoutConfig;
	handleBreakoutClick: (groupBy: BaseAutocompleteData) => void;
} => {
	const { redirectWithQueryBuilderData } = useQueryBuilder();

	const redirectToViewMode = useCallback(
		(query: Query): void => {
			redirectWithQueryBuilderData(
				query,
				{ [QueryParams.expandedWidgetId]: widgetId },
				undefined,
				true,
			);
		},
		[widgetId, redirectWithQueryBuilderData],
	);

	const handleBreakoutClick = useCallback(
		(groupBy: BaseAutocompleteData): void => {
			console.log('Breakout click:', { widgetId, query, groupBy, aggregateData });

			if (!aggregateData) {
				console.warn('aggregateData is null in handleBreakoutClick');
				return;
			}

			const filtersToAdd = aggregateData.filters || [];
			const breakoutQuery = getBreakoutQuery(
				query,
				aggregateData,
				groupBy,
				filtersToAdd,
			);

			redirectToViewMode(breakoutQuery);
			onClose();
		},
		[query, widgetId, aggregateData, redirectToViewMode, onClose],
	);

	const handleBackClick = useCallback(() => {
		setSubMenu('');
	}, [setSubMenu]);

	const breakoutConfig = useMemo(() => {
		if (!aggregateData) {
			console.warn('aggregateData is null in breakoutConfig');
			return {};
		}

		const queryData = getQueryData(query, aggregateData.queryName || '');

		return {
			// header: 'Breakout by',
			items: (
				<>
					<ContextMenu.Header>
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<ArrowLeft
								size={14}
								style={{ cursor: 'pointer' }}
								onClick={handleBackClick}
							/>
							<span>Breakout by</span>
						</div>
					</ContextMenu.Header>
					<BreakoutOptions
						queryData={queryData}
						onColumnClick={handleBreakoutClick}
					/>
				</>
			),
		};
	}, [query, aggregateData, handleBreakoutClick, handleBackClick]);

	return { breakoutConfig, handleBreakoutClick };
};

export default useBreakout;
