import { PANEL_TYPES } from 'constants/queryBuilder';
import useDashboardVarConfig from 'container/QueryTable/Drilldown/useDashboardVarConfig';
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
	panelType,
}: {
	query: Query;
	widgetId: string;
	onClose: () => void;
	subMenu: string;
	setSubMenu: (subMenu: string) => void;
	aggregateData: AggregateData | null;
	contextLinks?: ContextLinksData;
	panelType?: PANEL_TYPES;
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

	const fieldVariables = useMemo(() => {
		if (!aggregateData?.filters) return {};

		// Extract field variables from aggregation data filters
		const fieldVars: Record<string, string | number | boolean> = {};

		aggregateData.filters.forEach((filter) => {
			// Exclude queryName from fieldVariables
			if (
				filter.filterKey &&
				filter.filterValue !== undefined &&
				filter.filterKey !== aggregateData.queryName
			) {
				fieldVars[filter.filterKey] = filter.filterValue;
			}
		});

		return fieldVars;
	}, [aggregateData]);

	const { dashbaordVariablesConfig } = useDashboardVarConfig({
		setSubMenu,
		fieldVariables,
		query,
		// panelType,
		aggregateData,
		widgetId,
		onClose,
	});

	const { baseAggregateOptionsConfig } = useBaseAggregateOptions({
		query,
		onClose,
		aggregateData,
		subMenu,
		setSubMenu,
		contextLinks,
		panelType,
		fieldVariables,
	});

	const aggregateDrilldownConfig = useMemo(() => {
		if (!aggregateData) {
			console.warn('aggregateData is null in aggregateDrilldownConfig');
			return {};
		}

		if (subMenu === 'breakout') {
			// todo: declare keys in constants
			return breakoutConfig;
		}

		if (subMenu === 'dashboard_variables') {
			return dashbaordVariablesConfig;
		}

		return baseAggregateOptionsConfig;
	}, [
		subMenu,
		aggregateData,
		breakoutConfig,
		baseAggregateOptionsConfig,
		dashbaordVariablesConfig,
	]);

	return { aggregateDrilldownConfig };
};

export default useAggregateDrilldown;
