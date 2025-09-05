import { PANEL_TYPES } from 'constants/queryBuilder';
import useDashboardVarConfig from 'container/QueryTable/Drilldown/useDashboardVarConfig';
import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { ContextLinksData } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { getTimeRange } from 'utils/getTimeRange';

import { ContextMenuItem } from './contextConfig';
import { FilterData, getQueryData } from './drilldownUtils';
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
	queryRange,
}: {
	query: Query;
	widgetId: string;
	onClose: () => void;
	subMenu: string;
	setSubMenu: (subMenu: string) => void;
	aggregateData: AggregateData | null;
	contextLinks?: ContextLinksData;
	panelType?: PANEL_TYPES;
	queryRange?: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
}): {
	aggregateDrilldownConfig: {
		header?: string | React.ReactNode;
		items?: ContextMenuItem;
	};
} => {
	// Ensure aggregateData has timeRange, fallback to widget time or global time if not provided
	const aggregateDataWithTimeRange = useMemo(() => {
		if (!aggregateData) return null;

		// If timeRange is already provided, use it
		if (aggregateData.timeRange) return aggregateData;

		// Try to get widget-specific time range first, then fall back to global time
		const timeRangeData = getTimeRange(queryRange);

		return {
			...aggregateData,
			timeRange: {
				startTime: timeRangeData.startTime,
				endTime: timeRangeData.endTime,
			},
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [aggregateData]);

	const { breakoutConfig } = useBreakout({
		query,
		widgetId,
		onClose,
		aggregateData: aggregateDataWithTimeRange,
		setSubMenu,
		panelType,
	});

	const fieldVariables = useMemo(() => {
		if (!aggregateDataWithTimeRange?.filters) return {};

		// Extract field variables from aggregation data filters
		const fieldVars: Record<string, string | number | boolean> = {};

		// Get groupBy fields from the specific queryData item that matches the queryName
		const groupByFields: string[] = [];
		if (aggregateDataWithTimeRange.queryName) {
			// Find the specific queryData item that matches the queryName
			const matchingQueryData = getQueryData(
				query,
				aggregateDataWithTimeRange.queryName,
			);

			if (matchingQueryData?.groupBy) {
				matchingQueryData.groupBy.forEach((field) => {
					if (field.key && !groupByFields.includes(field.key)) {
						groupByFields.push(field.key);
					}
				});
			}
		}

		aggregateDataWithTimeRange.filters.forEach((filter) => {
			if (filter.filterKey && filter.filterValue !== undefined) {
				// Check if this field is present in groupBy from the query
				const isFieldInGroupBy = groupByFields.includes(filter.filterKey);

				if (isFieldInGroupBy) {
					fieldVars[filter.filterKey] = filter.filterValue;
				}
			}
		});

		return fieldVars;
	}, [
		aggregateDataWithTimeRange?.filters,
		aggregateDataWithTimeRange?.queryName,
		query,
	]);

	const { dashbaordVariablesConfig } = useDashboardVarConfig({
		setSubMenu,
		fieldVariables,
		query,
		// panelType,
		aggregateData: aggregateDataWithTimeRange,
		widgetId,
		onClose,
	});

	const { baseAggregateOptionsConfig } = useBaseAggregateOptions({
		query,
		onClose,
		aggregateData: aggregateDataWithTimeRange,
		subMenu,
		setSubMenu,
		contextLinks,
		panelType,
		fieldVariables,
	});

	const aggregateDrilldownConfig = useMemo(() => {
		if (!aggregateDataWithTimeRange) {
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
		aggregateDataWithTimeRange,
		breakoutConfig,
		baseAggregateOptionsConfig,
		dashbaordVariablesConfig,
	]);

	return { aggregateDrilldownConfig };
};

export default useAggregateDrilldown;
