import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { Widgets } from 'types/api/dashboard/getAll';
import { DataSource } from 'types/common/queryBuilder';
import { getGraphType } from 'utils/getGraphType';

// Builds the useGetQueryRange payload for a public-dashboard panel, mirroring the
// authenticated GridCard.
export const getPublicPanelRequestData = ({
	widget,
	startTime,
	endTime,
}: {
	widget: Widgets;
	startTime: number;
	endTime: number;
}): GetQueryResultsProps => {
	const updatedQuery = widget?.query;

	if (widget.panelTypes !== PANEL_TYPES.LIST) {
		return {
			selectedTime: widget?.timePreferance,
			graphType: getGraphType(widget.panelTypes),
			query: updatedQuery,
			variables: {}, // we are not supporting variables in public dashboards
			fillGaps: widget.fillSpans,
			formatForWeb: widget.panelTypes === PANEL_TYPES.TABLE,
			start: startTime,
			end: endTime,
			originalGraphType: widget.panelTypes,
		};
	}

	const initialDataSource = updatedQuery.builder.queryData[0].dataSource;

	return {
		query: updatedQuery,
		graphType: PANEL_TYPES.LIST,
		selectedTime: widget.timePreferance || 'GLOBAL_TIME',
		tableParams: {
			pagination: {
				offset: 0,
				limit: updatedQuery.builder.queryData[0].limit || 0,
			},
			// we do not need select columns in case of logs
			selectColumns:
				initialDataSource === DataSource.TRACES && widget.selectedTracesFields,
		},
		fillGaps: widget.fillSpans,
		start: startTime,
		end: endTime,
	};
};
