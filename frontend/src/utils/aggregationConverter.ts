import { createAggregation } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	LogAggregation,
	MetricAggregation,
	TraceAggregation,
} from 'types/api/v5/queryRange';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

/**
 * Converts QueryV2 aggregations to BaseAutocompleteData format
 * for compatibility with existing OrderByFilter component
 */
function convertAggregationsToBaseAutocompleteData(
	aggregations:
		| TraceAggregation[]
		| LogAggregation[]
		| MetricAggregation[]
		| undefined,
	dataSource: DataSource,
	metricName?: string,
	spaceAggregation?: string,
): BaseAutocompleteData[] {
	// If no aggregations provided, return default based on data source
	if (!aggregations || aggregations.length === 0) {
		switch (dataSource) {
			case DataSource.METRICS:
				return [
					{
						id: uuid(),
						dataType: DataTypes.Float64,
						type: '',
						key: `${spaceAggregation || 'avg'}(${metricName || 'metric'})`,
					},
				];
			case DataSource.TRACES:
			case DataSource.LOGS:
			default:
				return [
					{
						id: uuid(),
						dataType: DataTypes.Float64,
						type: '',
						key: 'count()',
					},
				];
		}
	}

	return aggregations.map((agg) => {
		if ('expression' in agg) {
			// TraceAggregation or LogAggregation
			const { expression } = agg;
			const alias = 'alias' in agg ? agg.alias : '';
			const displayKey = alias || expression;

			return {
				id: uuid(),
				dataType: DataTypes.Float64,
				type: '',
				key: displayKey,
			};
		}
		// MetricAggregation
		const { metricName: aggMetricName, spaceAggregation: aggSpaceAggregation } =
			agg;
		const displayKey = `${aggSpaceAggregation}(${aggMetricName})`;

		return {
			id: uuid(),
			dataType: DataTypes.Float64,
			type: '',
			key: displayKey,
		};
	});
}

/**
 * Enhanced function that uses createAggregation to parse aggregations first
 * then converts them to BaseAutocompleteData format for OrderByFilter
 */
export function getParsedAggregationOptionsForOrderBy(
	query: {
		aggregations?: TraceAggregation[] | LogAggregation[] | MetricAggregation[];
		dataSource: DataSource;
		aggregateAttribute?: { key: string };
		spaceAggregation?: string;
		timeAggregation?: string;
		temporality?: string;
	},
	panelType?: PANEL_TYPES,
): BaseAutocompleteData[] {
	// First, use createAggregation to parse the aggregations
	const parsedAggregations = createAggregation(query, panelType);

	// Then convert the parsed aggregations to BaseAutocompleteData format
	return convertAggregationsToBaseAutocompleteData(
		parsedAggregations,
		query.dataSource,
		query.aggregateAttribute?.key,
		query.spaceAggregation,
	);
}
