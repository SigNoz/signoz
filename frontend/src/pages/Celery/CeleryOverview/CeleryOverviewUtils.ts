import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { Widgets } from 'types/api/dashboard/getAll';

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
