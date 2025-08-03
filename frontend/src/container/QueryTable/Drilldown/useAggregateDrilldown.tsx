import { useMemo } from 'react';
import { ContextLinksData } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { ContextMenuItem } from './contextConfig';
import { FilterData } from './drilldownUtils';
import useBaseAggregateOptions from './useBaseAggregateOptions';
import useBreakout from './useBreakout';

// Type for aggregate data
export interface AggregateData {
	queryName: string;
	filters: FilterData[];
	timeRange?: {
		startTime: number;
		endTime: number;
	};
}

const useAggregateDrilldown = ({
	query,
	widgetId,
	onClose,
	subMenu,
	setSubMenu,
	aggregateData,
	contextLinks,
}: {
	query: Query;
	widgetId: string;
	onClose: () => void;
	subMenu: string;
	setSubMenu: (subMenu: string) => void;
	aggregateData: AggregateData | null;
	contextLinks?: ContextLinksData;
}): {
	aggregateDrilldownConfig: {
		header?: string | React.ReactNode;
		items?: ContextMenuItem;
	};
} => {
	// New function to test useBreakout hook
	const { breakoutConfig } = useBreakout({
		query,
		widgetId,
		onClose,
		aggregateData,
	});

	const { baseAggregateOptionsConfig } = useBaseAggregateOptions({
		query,
		widgetId,
		onClose,
		aggregateData,
		subMenu,
		setSubMenu,
		contextLinks,
	});

	const aggregateDrilldownConfig = useMemo(() => {
		if (!aggregateData) {
			console.warn('aggregateData is null in testBreakoutConfig');
			return {};
		}

		// If subMenu is breakout, use the new breakout hook
		if (subMenu === 'breakout') {
			return breakoutConfig;
		}

		// Otherwise, use the existing getAggregateContextMenuConfig
		return baseAggregateOptionsConfig;
	}, [subMenu, aggregateData, breakoutConfig, baseAggregateOptionsConfig]);

	return { aggregateDrilldownConfig };
};

export default useAggregateDrilldown;
