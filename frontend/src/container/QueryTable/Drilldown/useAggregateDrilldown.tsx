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
	label?: string | React.ReactNode;
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
	const { breakoutConfig } = useBreakout({
		query,
		widgetId,
		onClose,
		aggregateData,
		setSubMenu,
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
			console.warn('aggregateData is null in aggregateDrilldownConfig');
			return {};
		}

		if (subMenu === 'breakout') {
			return breakoutConfig;
		}

		return baseAggregateOptionsConfig;
	}, [subMenu, aggregateData, breakoutConfig, baseAggregateOptionsConfig]);

	return { aggregateDrilldownConfig };
};

export default useAggregateDrilldown;
