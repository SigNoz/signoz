import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ArrowLeft } from 'lucide-react';
import ContextMenu from 'periscope/components/ContextMenu';
import { useCallback, useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import BreakoutOptions from './BreakoutOptions';
import { getQueryData } from './drilldownUtils';
import { getBreakoutPanelType, getBreakoutQuery } from './tableDrilldownUtils';
import { BreakoutAttributeType } from './types';
import { AggregateData } from './useAggregateDrilldown';

interface UseBreakoutProps {
	query: Query;
	widgetId: string;
	onClose: () => void;
	aggregateData: AggregateData | null;
	setSubMenu: (subMenu: string) => void;
	panelType?: PANEL_TYPES;
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
	panelType,
}: UseBreakoutProps): {
	breakoutConfig: BreakoutConfig;
	handleBreakoutClick: (groupBy: BreakoutAttributeType) => void;
} => {
	const { redirectWithQueryBuilderData } = useQueryBuilder();

	const redirectToViewMode = useCallback(
		(query: Query, panelType?: PANEL_TYPES): void => {
			redirectWithQueryBuilderData(
				query,
				{
					[QueryParams.expandedWidgetId]: widgetId,
					...(panelType && { [QueryParams.graphType]: panelType }),
				},
				undefined,
				true,
			);
		},
		[widgetId, redirectWithQueryBuilderData],
	);

	const handleBreakoutClick = useCallback(
		(groupBy: BreakoutAttributeType): void => {
			if (!aggregateData) {
				return;
			}

			const filtersToAdd = aggregateData.filters || [];
			const breakoutQuery = getBreakoutQuery(
				query,
				aggregateData,
				groupBy,
				filtersToAdd,
			);

			const breakoutPanelType = getBreakoutPanelType(
				// breakoutQuery,
				panelType,
				// groupBy,
			);

			redirectToViewMode(breakoutQuery, breakoutPanelType);
			onClose();
		},
		[query, aggregateData, redirectToViewMode, onClose, panelType],
	);

	const handleBackClick = useCallback(() => {
		setSubMenu('');
	}, [setSubMenu]);

	const breakoutConfig = useMemo(() => {
		if (!aggregateData) {
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
