import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { Widgets } from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
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
		isColumn: false,
		isJSON: false,
		id: `${key}--${dataType || DataTypes.String}--${type || 'tag'}--false`,
	},
	op: op || '=',
	value: value.toString(),
});
