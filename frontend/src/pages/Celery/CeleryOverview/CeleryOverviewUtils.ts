import type { PANEL_TYPES } from 'constants/queryBuilderPanelTypes';
import type { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import type { SuccessResponse } from 'types/api';
import type { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import type { Widgets } from 'types/api/widgets/widget';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuidv4 } from 'uuid';

export const getQueryPayloadFromWidgetsData = ({
	start,
	end,
	widgetsData,
	panelType,
}: {
	start: number;
	end: number;
	widgetsData: Widgets[];
	panelType: PANEL_TYPES;
}): GetQueryResultsProps[] =>
	widgetsData.map((widget) => ({
		start,
		end,
		graphType: panelType,
		query: widget.query,
		selectedTime: 'GLOBAL_TIME',
		formatForWeb: false,
		variables: {},
	}));

export const getValueFromScalarResponse = (
	response: SuccessResponse<MetricRangePayloadProps> | undefined,
): string => {
	const result = response?.payload?.data?.newResult?.data?.result?.[0];
	const value = parseFloat(
		result?.table?.rows?.[0]?.data?.[result.queryName] ?? 'NaN',
	);
	return Number.isNaN(value) ? 'NaN' : value.toFixed(2);
};

export const getFiltersFromKeyValue = (
	key: string,
	value: string | number,
	type?: string,
	op?: string,
	dataType?: DataTypes,
): TagFilterItem => ({
	id: uuidv4(),
	key: {
		key,
		dataType: dataType || DataTypes.String,
		type: type || 'tag',
		id: `${key}--${dataType || DataTypes.String}--${type || 'tag'}--false`,
	},
	op: op || '=',
	value: value.toString(),
});
